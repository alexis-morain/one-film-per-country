"""Assemble la liste finale : un film par pays, niveau A > B > C.

Entrées : data/raw/tierA*.json, tierB_tmdb.json, tierC_fatw_raw.json, restcountries.json
Sorties : data/films_du_monde.json, films-du-monde.xlsx
"""
import glob
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tmdb_tier_b import API, RAW, ROOT, countries, get  # noqa: E402

MIN_VOTES_B = 50
CONTINENTS = {"Europe": "Europe", "Asia": "Asie", "Africa": "Afrique",
              "Americas": "Amériques", "Oceania": "Océanie", "Antarctic": "Antarctique"}
MIDDLE_EAST = {"IR", "IQ", "IL", "PS", "LB", "SY", "JO", "SA", "AE", "KW", "QA",
               "BH", "OM", "YE", "TR", "CY"}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def load_tier_a():
    by = {}
    for f in sorted(glob.glob(str(RAW / "tierA_*.json"))) + sorted(glob.glob(str(RAW / "tierA2_*.json"))):
        for x in json.loads(Path(f).read_text()):
            old = by.get(x["iso2"])
            if old is None or x.get("level") == "A" or old.get("level") != "A":
                if old and old.get("note") and x.get("level") != "A":
                    x["note"] = f"{x.get('note') or ''} / {old['note']}".strip(" /")
                by[x["iso2"]] = {**(old or {}), **x}
            elif x.get("video_phenomenon"):
                old["video_phenomenon"] = x["video_phenomenon"]
    return by


def load_fatw(clist):
    raw = json.loads((RAW / "tierC_fatw_raw.json").read_text())
    names = {}
    for c in clist:
        for n in [c["name"]["common"], c["name"]["official"], *c.get("altSpellings", [])]:
            names[norm(n)] = c["cca2"]
    names.update({norm("Ivory Coast"): "CI", norm("Swaziland"): "SZ",
                  norm("East Timor"): "TL", norm("Republic of the Congo"): "CG",
                  norm("Democratic Republic of the Congo"): "CD",
                  norm("Guinea Bissau"): "GW", norm("Cabo Verde"): "CV",
                  norm("Vatican"): "VA", norm("Czech Republic"): "CZ",
                  norm("Turkey"): "TR", norm("Macedonia"): "MK",
                  norm("Micronesia"): "FM", norm("Burma"): "MM"})
    out = {}
    for r in raw:
        parts = [p.strip() for p in r["text"].split("|") if p.strip()]
        iso = names.get(norm(parts[0]))
        if not iso:
            continue
        meta = parts[2] if len(parts) > 2 else ""
        out[iso] = {"title": html.unescape(parts[1]), "year": (re.findall(r"\d{4}", meta) or [""])[0],
                    "outside_view": "outside view" in r["text"],
                    "url": f"https://filmsaroundthe.world/country/{r['slug']}/films/{r['film_slug']}/"}
    return out


def tmdb_find(title, year, lang=None):
    """Retrouve un film TMDB à partir d'un titre et d'une année."""
    for q in [title]:
        if not q:
            continue
        for params in ({"query": q, "year": year}, {"query": q}):
            res = get(f"{API}/search/movie", {**{k: v for k, v in params.items() if v}, "language": "fr-FR"})
            hits = res.get("results", [])
            if lang:
                hits = sorted(hits, key=lambda m: m["original_language"] != lang)
            for m in hits:
                y = (m.get("release_date") or "0000")[:4]
                if not year or abs(int(y or 0) - int(year)) <= 1:
                    return m
    return None


def is_doc(m):
    """Documentaire selon TMDB (genre 99)."""
    return bool(m) and 99 in m.get("genre_ids", [])


def enrich(tmdb_id):
    d = get(f"{API}/movie/{tmdb_id}", {"language": "fr-FR", "append_to_response": "watch/providers"})
    fr = d.get("watch/providers", {}).get("results", {}).get("FR", {})
    prov = []
    for kind, label in (("flatrate", "abonnement"), ("free", "gratuit"), ("ads", "gratuit pub"),
                        ("rent", "location"), ("buy", "achat")):
        names = [p["provider_name"] for p in fr.get(kind, [])]
        if names:
            prov.append(f"{label} : {', '.join(names[:4])}")
    en = get(f"{API}/movie/{tmdb_id}", {"language": "en-US"})
    providers = {kind: [p["provider_name"] for p in fr.get(kind, [])][:5]
                 for kind in ("flatrate", "free", "ads", "rent", "buy") if fr.get(kind)}
    return {"title_fr": d.get("title"), "runtime": d.get("runtime"), "imdb_id": d.get("imdb_id"),
            "where_fr": " ; ".join(prov), "tmdb_url": f"https://www.themoviedb.org/movie/{tmdb_id}",
            "tmdb_id": tmdb_id, "title_en_tmdb": en.get("title"),
            "poster": d.get("poster_path") or en.get("poster_path"), "backdrop": d.get("backdrop_path"),
            "overview_fr": d.get("overview"), "overview_en": en.get("overview"),
            "providers_fr": providers, "justwatch_fr": fr.get("link", "")}


def main():
    clist = countries()
    tier_a = load_tier_a()
    tier_b = {x["iso2"]: x for x in json.loads((RAW / "tierB_tmdb.json").read_text())}
    fatw = load_fatw(clist)
    overrides = json.loads((ROOT / "data" / "overrides.json").read_text())
    rows = []
    used = set()
    # les pays sans niveau A passent après, pour ne pas prendre le film d'un pays qui le produit
    owner_first = lambda c: tier_a.get(c["cca2"], {}).get("level") != "A"
    for c in sorted(clist, key=owner_first):
        iso = c["cca2"]
        a, b, f = tier_a.get(iso, {}), tier_b.get(iso, {}), fatw.get(iso)
        # pays producteur cité en premier d'abord, puis par votes ; un film déjà pris est écarté
        cands = sorted((t for t in b.get("top", []) if t["role"] != "coprod" and t["tmdb_id"] not in used),
                       key=lambda t: ((t.get("production_countries") or [""])[0] != iso, -t["votes"]))
        b_best = cands[0] if cands else None
        row = {"iso2": iso, "pays": c.get("translations", {}).get("fra", {}).get("common", c["name"]["common"]),
               "country": c["name"]["common"],
               "continent": "Moyen-Orient" if iso in MIDDLE_EAST else CONTINENTS.get(c.get("region"), c.get("region")),
               "tmdb_top": f"{b_best['original_title']} ({b_best['year']}, {b_best['votes']} votes)" if b_best else "",
               "fatw": f"{f['title']} ({f['year']})" if f and not f["outside_view"] else "",
               "video": "", "note": a.get("note") or ""}
        vp = a.get("video_phenomenon")
        if vp:
            row["video"] = vp if isinstance(vp, str) else json.dumps(vp, ensure_ascii=False)
        tmdb_id = None
        if a.get("level") == "A":
            m = tmdb_find(a.get("title_original"), a.get("year"), a.get("language")) or \
                tmdb_find(a.get("title_en"), a.get("year"), a.get("language"))
            tmdb_id = m["id"] if m else None
            row.update(niveau="A", fiabilite="forte" if a.get("metric") == "admissions" else "bonne",
                       titre_original=a.get("title_original"), titre_en=a.get("title_en"),
                       annee=a.get("year"), langue=a.get("language"), animation=a.get("animation"),
                       critere=f"{'entrées' if a.get('metric') == 'admissions' else 'recettes nationales'} : {a.get('value')}",
                       source=a.get("source_url"), second=a.get("runner_up") or "")
        elif b_best and b_best["votes"] >= MIN_VOTES_B:
            tmdb_id = b_best["tmdb_id"]
            row.update(niveau="B", fiabilite="moyenne", titre_original=b_best["original_title"],
                       titre_en=b_best["title"], annee=b_best["year"], langue=b_best["language"],
                       animation=b_best["animation"], critere=f"popularité TMDB : {b_best['votes']} votes",
                       source=f"https://www.themoviedb.org/movie/{b_best['tmdb_id']}", second="")
        elif f and not f["outside_view"] and not is_doc(fm := tmdb_find(f["title"], f["year"])):
            m = fm
            tmdb_id = m["id"] if m else None
            row.update(niveau="C", fiabilite="faible (choix éditorial, pas d'audience)",
                       titre_original=(m or {}).get("original_title") or f["title"], titre_en=f["title"],
                       annee=f["year"], langue=(m or {}).get("original_language", ""),
                       animation=16 in (m or {}).get("genre_ids", []),
                       critere="choix « native » de Films Around the World", source=f["url"], second="")
        elif b_best:
            tmdb_id = b_best["tmdb_id"]
            row.update(niveau="D", fiabilite="très faible (moins de 50 votes)",
                       titre_original=b_best["original_title"], titre_en=b_best["title"],
                       annee=b_best["year"], langue=b_best["language"], animation=b_best["animation"],
                       critere=f"popularité TMDB : {b_best['votes']} votes",
                       source=f"https://www.themoviedb.org/movie/{b_best['tmdb_id']}", second="")
        else:
            row.update(niveau="-", fiabilite="aucun film trouvé", titre_original="", titre_en="",
                       annee="", langue="", animation=False, critere="", source="", second="")
        if iso in overrides:
            o = dict(overrides[iso])
            no_tmdb = o.pop("no_tmdb", False)
            forced = o.pop("tmdb_id", None)  # fiche TMDB retrouvée à la main
            o["note"] = f"{o.get('note', '')} {row['note']}".strip()
            row.update(o)
            if forced:
                tmdb_id = forced
            elif no_tmdb or "titre_original" in o:
                m = None if no_tmdb else tmdb_find(o.get("titre_original"), o.get("annee")) or \
                    tmdb_find(o.get("titre_en"), o.get("annee"))
                tmdb_id = m["id"] if m else None
        row.update(enrich(tmdb_id) if tmdb_id else {"title_fr": "", "runtime": None, "imdb_id": "",
                                                    "where_fr": "", "tmdb_url": "", "tmdb_id": None,
                                                    "title_en_tmdb": "", "poster": None, "backdrop": None,
                                                    "overview_fr": "", "overview_en": "",
                                                    "providers_fr": {}, "justwatch_fr": ""})
        row["ccn3"] = c.get("ccn3", "")
        if tmdb_id:
            used.add(tmdb_id)
        rows.append(row)
        print(f"{iso} {row['niveau']} {row['titre_original'][:40]}")
    rows.sort(key=lambda r: norm(r["pays"]))
    (ROOT / "data" / "films_du_monde.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
