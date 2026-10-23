"""Niveau B : film national le plus voté sur TMDB, par pays, dans une langue du pays.

Sortie : data/raw/tierB_tmdb.json (top 5 par pays).
"""
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
API = "https://api.themoviedb.org/3"


def load_key():
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("TMDB_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("TMDB_API_KEY absent de .env")


KEY = load_key()


def get(url, params=None):
    params = dict(params or {})
    if "themoviedb" in url:
        params["api_key"] = KEY
    full = url + ("?" + urllib.parse.urlencode(params) if params else "")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(full, timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"échec : {url}")


def countries():
    """Pays souverains (restcountries) avec leurs langues en nom anglais."""
    cache = RAW / "restcountries.json"
    if not cache.exists():
        data = get("https://restcountries.com/v3.1/all",
                   {"fields": "cca2,name,languages,independent,unMember,region,subregion"})
        cache.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    data = json.loads(cache.read_text())
    keep = [c for c in data if c.get("independent") or c.get("unMember")
            or c["cca2"] in {"PS", "XK", "TW", "HK", "VA", "EH"}]
    return sorted(keep, key=lambda c: c["name"]["common"])


def language_map():
    """Nom anglais de langue -> code ISO 639-1 selon TMDB."""
    langs = get(f"{API}/configuration/languages")
    m = {l["english_name"].lower(): l["iso_639_1"] for l in langs}
    # écarts de nommage restcountries / TMDB
    m.update({"chinese": "zh", "cantonese": "cn", "persian (farsi)": "fa",
              "swahili": "sw", "filipino": "tl", "dhivehi": "dv",
              "kyrgyz": "ky", "khmer": "km", "lao": "lo", "burmese": "my",
              "tetum": "pt", "sotho": "st", "tswana": "tn", "swazi": "ss",
              "kinyarwanda": "rw", "kirundi": "rn", "chichewa": "ny",
              "malagasy": "mg", "somali": "so", "tigrinya": "ti",
              "amharic": "am", "norwegian nynorsk": "no",
              "norwegian bokmål": "no", "norwegian": "no", "greek": "el",
              "luxembourgish": "lb", "samoan": "sm", "tongan": "to",
              "fijian": "fj", "fiji hindi": "hi", "bislama": "bi",
              "hiri motu": "ho", "tok pisin": "tpi", "nauru": "na",
              "marshallese": "mh", "palauan": "pau", "gilbertese": "gil",
              "tuvaluan": "tvl", "haitian creole": "ht", "papiamento": "pap",
              "seychellois creole": "crs", "mauritian creole": "mfe",
              "sango": "sg", "dzongkha": "dz", "nepali": "ne",
              "sinhala": "si", "tamil": "ta", "urdu": "ur", "bengali": "bn",
              "pashto": "ps", "turkmen": "tk", "tajik": "tg", "uzbek": "uz",
              "kazakh": "kk", "mongolian": "mn", "azerbaijani": "az",
              "armenian": "hy", "georgian": "ka", "belarusian": "be",
              "irish": "ga", "maltese": "mt", "icelandic": "is",
              "albanian": "sq", "macedonian": "mk", "bosnian": "bs",
              "montenegrin": "sr", "serbian": "sr", "croatian": "hr",
              "slovene": "sl", "hebrew": "he", "arabic": "ar",
              "berber": "ber", "tamazight": "ber", "zulu": "zu",
              "xhosa": "xh", "afrikaans": "af", "shona": "sn",
              "northern ndebele": "nd", "southern ndebele": "nr",
              "ndonga": "ng", "herero": "hz", "kikongo": "kg",
              "lingala": "ln", "tshiluba": "lu", "wolof": "wo",
              "comorian": "ar", "guaraní": "gn", "quechua": "qu",
              "aymara": "ay", "maori": "mi", "māori": "mi",
              "new zealand sign language": "en",
              "austro-bavarian german": "de", "swiss german": "de",
              "maldivian": "dv", "hassaniya": "ar", "romansh": "rm"})
    return m


# Langues de cinéma absentes de la liste officielle de restcountries
EXTRA_LANGS = {
    "IN": {"te", "ml", "kn", "bn", "mr", "pa", "gu"},
    "PK": {"pa"}, "NG": {"yo", "ig", "ha"}, "GH": {"tw", "ak"},
    "SN": {"wo"}, "ML": {"bm"}, "BF": {"bm"}, "NE": {"ha"},
    "ES": {"ca", "eu", "gl"}, "PH": {"tl"}, "KE": {"sw"}, "CN": {"cn"},
    "HK": {"cn"}, "MO": {"cn"}, "ET": {"am"}, "MA": {"ar"},
    "IR": {"fa"}, "AF": {"fa"}, "IQ": {"ku"}, "UA": {"ru"},
    "BY": {"ru"}, "KZ": {"ru"}, "LV": {"ru"}, "EE": {"ru"},
}


def discover(iso2, langs, page=1):
    params = {"with_origin_country": iso2, "sort_by": "vote_count.desc",
              "without_genres": "99", "include_adult": "false", "page": page,
              "language": "fr-FR"}
    if langs:
        params["with_original_language"] = "|".join(sorted(langs))
    return get(f"{API}/discover/movie", params)


DETAILS = {}


def details(tmdb_id):
    if tmdb_id not in DETAILS:
        DETAILS[tmdb_id] = get(f"{API}/movie/{tmdb_id}")
    return DETAILS[tmdb_id]


def role(iso2, d):
    """'solo' si seul pays, 'first' si pays de production cité en premier, sinon 'coprod'."""
    prod = [p["iso_3166_1"] for p in d.get("production_countries", [])]
    origin = d.get("origin_country", [])
    if set(prod) <= {iso2} and set(origin) <= {iso2}:
        return "solo"
    if (prod and prod[0] == iso2) or (origin and origin[0] == iso2):
        return "first"
    return "coprod"


RANK = {"solo": 0, "first": 1, "coprod": 2}


def main():
    lmap = language_map()
    out = []
    for c in countries():
        iso2 = c["cca2"]
        names = [n.lower() for n in (c.get("languages") or {}).values()]
        langs = {lmap[n] for n in names if n in lmap} | EXTRA_LANGS.get(iso2, set())
        unknown = [n for n in names if n not in lmap]
        res = discover(iso2, langs) if langs else {"results": [], "total_results": 0}
        top = []
        for m in res.get("results", [])[:12]:
            d = details(m["id"])
            top.append({"tmdb_id": m["id"], "imdb_id": d.get("imdb_id"),
                        "title": m.get("title"),
                        "original_title": m["original_title"],
                        "year": (m.get("release_date") or "")[:4],
                        "language": m["original_language"],
                        "votes": m["vote_count"], "rating": m["vote_average"],
                        "animation": 16 in m.get("genre_ids", []),
                        "runtime": d.get("runtime"),
                        "production_countries": [p["iso_3166_1"] for p in d.get("production_countries", [])],
                        "role": role(iso2, d)})
        # national d'abord (seul pays ou cité en premier), puis par votes
        top.sort(key=lambda t: (t["role"] == "coprod", -t["votes"]))
        top = top[:5]
        out.append({"iso2": iso2, "country": c["name"]["common"],
                    "region": c.get("region"), "subregion": c.get("subregion"),
                    "languages": sorted(langs), "unmapped_languages": unknown,
                    "total_matches": res.get("total_results", 0), "top": top})
        print(f"{iso2} {c['name']['common'][:28]:28} {','.join(sorted(langs)):14} "
              f"{top[0]['original_title'][:40] if top else '-':40} "
              f"{top[0]['votes'] if top else 0} {top[0]['role'] if top else ''}")
        time.sleep(0.05)
    (RAW / "tierB_tmdb.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
