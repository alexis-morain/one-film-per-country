"""Exporte data/films_du_monde.json vers site/data/films.json (format compact du site)."""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rows = json.loads((ROOT / "data" / "films_du_monde.json").read_text())

CONTINENT_KEY = {"Europe": "europe", "Asie": "asia", "Afrique": "africa", "Amériques": "americas",
                 "Océanie": "oceania", "Moyen-Orient": "middle_east"}
# carte world-atlas : polygones sans code numérique, rattachés à un pays
NAME_TO_ISO = {"Kosovo": "XK", "Somaliland": "SO", "N. Cyprus": "CY"}


def metric(critere):
    """Découpe le critère en type + valeur, pour l'afficher dans les deux langues."""
    head, _, value = (critere or "").partition(" : ")
    if head.startswith("entrées"):
        kind = "admissions"
    elif head.startswith("recettes"):
        kind = "gross"
    elif head.startswith("popularité"):
        kind, value = "votes", value.replace(" votes", "")
    elif head.startswith("choix"):
        kind, value = "editorial", ""
    elif critere:
        kind, value = "press", critere
    else:
        kind = ""
    return kind, value.strip()


LATLNG = {c["cca2"]: c.get("latlng") for c in
          json.loads((ROOT / "data" / "raw" / "restcountries.json").read_text())}

def video_text(v):
    """Le champ vidéo est soit du texte, soit un objet JSON des agents de recherche."""
    if not v or not v.lstrip().startswith("{"):
        return v or ""
    d = json.loads(v)
    if not d.get("title"):
        return ""
    views = f", {d['views']} vues" if d.get("views") else ""
    url = f" ({d['url']})" if d.get("url") else ""
    return f"{d['title']}{views}{url}"


films = []
for r in rows:
    kind, value = metric(r.get("critere"))
    films.append({
        "iso2": r["iso2"], "ccn3": r.get("ccn3", ""), "latlng": LATLNG.get(r["iso2"]),
        "continent": CONTINENT_KEY.get(r["continent"], "other"),
        "level": r["niveau"] if r["niveau"] in "ABCD" else "",
        "title": r.get("titre_original") or "",
        "title_fr": r.get("title_fr") or "", "title_en": r.get("title_en_tmdb") or r.get("titre_en") or "",
        "year": str(r.get("annee") or ""), "lang": r.get("langue") or "",
        "animation": bool(r.get("animation")), "runtime": r.get("runtime"),
        "metric": kind, "value": value,
        "source": r.get("source") or "", "runner_up": r.get("second") or "",
        "tmdb_id": r.get("tmdb_id"), "imdb_id": r.get("imdb_id") or "",
        "poster": r.get("poster"), "backdrop": r.get("backdrop"),
        "overview_fr": r.get("overview_fr") or "", "overview_en": r.get("overview_en") or "",
        "providers_fr": r.get("providers_fr") or {}, "justwatch_fr": r.get("justwatch_fr") or "",
        "tmdb_top": r.get("tmdb_top") or "", "fatw": r.get("fatw") or "",
        "video": video_text(r.get("video")), "note_fr": r.get("note") or "",
    })

out = {"updated": date.today().isoformat(), "name_to_iso": NAME_TO_ISO, "films": films}
(ROOT / "site" / "data" / "films.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(len(films), "films ->", ROOT / "site" / "data" / "films.json")
