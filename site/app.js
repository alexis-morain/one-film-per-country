/* Un film par pays : carte, ticket, catalogue. Aucune dépendance hors d3 et topojson. */
(() => {
  "use strict";

  const IMG = "https://image.tmdb.org/t/p/";
  const STORE_SEEN = "ofpc.seen";
  const STORE_LANG = "ofpc.lang";
  const CONTINENTS = ["europe", "africa", "middle_east", "asia", "americas", "oceania"];
  const LEVELS = ["A", "B", "C", "D"];
  const LEVEL_COLOR = { A: "var(--lvl-a)", B: "var(--lvl-b)", C: "var(--lvl-c)", D: "var(--lvl-d)", "": "var(--lvl-none)" };
  // codes TMDB qui ne sont pas des codes de langue standard
  const LANG_FIX = { cn: "yue", zxx: "zxx", sh: "sr", mo: "ro", "fr/en": "fr" };
  // un pays dont l’aire sphérique (stéradians) est sous ce seuil reçoit un point, quelle que soit la taille de l’écran
  const MICRO_AREA = 3e-4;

  const T = {
    fr: {
      title: "Un film par pays",
      lede: "Le film national le plus vu dans chaque pays, dans sa langue d’origine.",
      skip: "Aller au contenu",
      random: "Tirer un pays au hasard",
      reset: "Recentrer", zoomIn: "Zoom avant", zoomOut: "Zoom arrière",
      loading: "Chargement de la carte…",
      loadError: "La carte n’a pas pu se charger. Rechargez la page.",
      mapLabel: "Carte du monde, un film par pays",
      mapSection: "Carte", asideLabel: "Fiche du film",
      catalogueTitle: "Les films, pays par pays",
      search: "Chercher", searchPh: "Pays ou film", levelLegend: "Fiabilité",
      fAvail: "Visible en France", fAnim: "Animation", fUnseen: "Pas encore vus",
      methodTitle: "Comment les films ont été choisis",
      tmdb: "Ce site utilise l’API TMDB sans être approuvé ni certifié par TMDB.",
      progress: (n, t) => `<strong>${n}</strong> pays vus sur ${t}`,
      count: (n) => n === 0 ? "Aucun film ne correspond à ces filtres." : `${n} film${n > 1 ? "s" : ""}`,
      continents: { europe: "Europe", africa: "Afrique", middle_east: "Moyen-Orient", asia: "Asie", americas: "Amériques", oceania: "Océanie", other: "Ailleurs" },
      levels: {
        A: "Box-office national sourcé",
        B: "Pas de box-office : le film du pays le plus noté sur TMDB",
        C: "Données rares : choix éditorial",
        D: "Dernier recours : très peu de votes",
        "": "Aucun film trouvé",
      },
      reliability: (l) => `Fiabilité ${l}`,
      posterOf: (title) => `Affiche de ${title}`,
      legendSeen: "Déjà vu",
      metric: {
        admissions: (v) => `${v} entrées en salle`,
        gross: (v) => `${v} de recettes nationales`,
        votes: (v) => `${v} votes sur TMDB`,
        editorial: () => "Choix « native » de Films Around the World",
        press: (v) => v,
      },
      why: "Pourquoi ce film", runnerUp: "Juste derrière", story: "L’histoire", where: "Où le voir en France",
      nowhere: "Pas de diffusion connue en France. Cherchez du côté des festivals, des cinémathèques ou de la plateforme du pays.",
      kinds: { flatrate: "abonnement", free: "gratuit", ads: "gratuit avec pub", rent: "location", buy: "achat" },
      links: "Liens", source: "Source du classement", alternatives: "Autres pistes",
      tmdbTop: "Le plus noté sur TMDB", fatw: "Choix de Films Around the World", video: "Phénomène vidéo",
      note: "Note", stub: (n) => `${n} pays`, short: "court-métrage", seen: "Je l’ai vu", seenOn: "Vu", min: "min", animation: "animation",
      noPoster: "Pas d’affiche", noFilm: "Aucun film de fiction trouvé pour ce pays.",
      introTitle: "Une soirée par pays",
      intro: [
        "Cliquez un pays sur la carte ou tirez-en un au hasard : plus il est clair, plus le choix est sûr.",
        "Cochez « Je l’ai vu » après la soirée : le pays passe en rouge, et la liste reste dans ce navigateur.",
      ],
      daily: "Le film du jour", dailyOpen: "Voir sa fiche",
      method: `
        <p>La question : quel film national les gens de chaque pays ont-ils le plus vu ? Pas le plus gros succès à l’export, pas le mieux noté par la critique. Le film qu’un pays est allé voir.</p>
        <p>Un film compte pour un pays si sa production et son équipe créative viennent de là, s’il est tourné dans une langue du pays, et si c’est une fiction. L’animation est acceptée. Un même film ne sert qu’une fois.</p>
        <dl>
          <dt><i style="background:var(--lvl-a)"></i>A</dt><dd>Box-office sourcé : le film national qui a fait le plus d’entrées dans le pays, ou à défaut le plus de recettes nationales. Sources : listes Wikipedia, instituts nationaux du cinéma, presse.</dd>
          <dt><i style="background:var(--lvl-b)"></i>B</dt><dd>Pas de box-office publié : le film du pays le plus noté sur TMDB, 50 votes minimum. Ça mesure la notoriété plus que l’audience locale.</dd>
          <dt><i style="background:var(--lvl-c)"></i>C</dt><dd>Données trop rares : le premier choix « native » de Films Around the World, une sélection éditoriale.</dd>
          <dt><i style="background:var(--lvl-d)"></i>D</dt><dd>Dernier recours : le film du pays le plus noté sur TMDB, moins de 50 votes.</dd>
        </dl>
        <p>Les records mélangent les époques : la Pologne et le Royaume-Uni ont des records des années 1950 comptés en entrées, d’autres pays des records récents comptés en recettes. Une vingtaine de choix ont été vérifiés à part, et chaque arbitrage manuel est expliqué dans les données.</p>
        <p>Une erreur, un meilleur candidat ? Les données et le code sont sur <a href="https://github.com/alexis-morain/one-film-per-country">GitHub</a>, les corrections sourcées sont bienvenues.</p>`,
      credits: (d) => `Données : <a href="https://www.themoviedb.org/">TMDB</a> (fiches, affiches, plateformes via JustWatch), listes de box-office Wikipedia et instituts nationaux, <a href="https://filmsaroundthe.world/">Films Around the World</a> pour les choix éditoriaux. Carte : Natural Earth via world-atlas.${d ? ` Mise à jour : ${d}.` : ""} Code et données sur <a href="https://github.com/alexis-morain/one-film-per-country">GitHub</a>.`,
    },
    en: {
      title: "One film per country",
      lede: "The most-watched national film in every country, in its original language.",
      skip: "Skip to content",
      random: "Pick a random country",
      reset: "Reset", zoomIn: "Zoom in", zoomOut: "Zoom out",
      loading: "Loading the map…",
      loadError: "The map could not load. Please reload the page.",
      mapLabel: "World map, one film per country",
      mapSection: "Map", asideLabel: "Film ticket",
      catalogueTitle: "The films, country by country",
      search: "Search", searchPh: "Country or film", levelLegend: "Reliability",
      fAvail: "Streaming in France", fAnim: "Animation", fUnseen: "Not seen yet",
      methodTitle: "How the films were chosen",
      tmdb: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
      progress: (n, t) => `<strong>${n}</strong> of ${t} countries watched`,
      count: (n) => n === 0 ? "No film matches these filters." : `${n} film${n > 1 ? "s" : ""}`,
      continents: { europe: "Europe", africa: "Africa", middle_east: "Middle East", asia: "Asia", americas: "Americas", oceania: "Oceania", other: "Elsewhere" },
      levels: {
        A: "Sourced national box office",
        B: "No box office data: the country’s most-rated film on TMDB",
        C: "Little data: editorial pick",
        D: "Last resort: very few votes",
        "": "No film found",
      },
      reliability: (l) => `Reliability ${l}`,
      posterOf: (title) => `Poster for ${title}`,
      legendSeen: "Watched",
      metric: {
        admissions: (v) => `${v} cinema admissions`,
        gross: (v) => `${v} national box office`,
        votes: (v) => `${v} votes on TMDB`,
        editorial: () => "“Native voice” pick by Films Around the World",
        press: () => "Record reported by the national press",
      },
      why: "Why this film", runnerUp: "Runner-up", story: "The story", where: "Where to watch in France",
      nowhere: "No known release in France. Try festivals, film archives or the country’s own platforms.",
      kinds: { flatrate: "subscription", free: "free", ads: "free with ads", rent: "rent", buy: "buy" },
      links: "Links", source: "Ranking source", alternatives: "Other leads",
      tmdbTop: "Most rated on TMDB", fatw: "Films Around the World pick", video: "Video phenomenon",
      note: "Note (in French)", stub: (n) => `${n} countries`, short: "short film", seen: "I’ve watched it", seenOn: "Seen", min: "min", animation: "animation",
      noPoster: "No poster", noFilm: "No fiction film found for this country.",
      introTitle: "One night, one country",
      intro: [
        "Click a country on the map or pick one at random: the lighter it is, the safer the pick.",
        "Tick “I’ve watched it” after the screening: the country turns red, and the list stays in this browser.",
      ],
      daily: "Film of the day", dailyOpen: "Open its ticket",
      method: `
        <p>The question: which national film did people in each country watch the most? Not the biggest export hit, not the critics’ favourite. The film a country actually went to see.</p>
        <p>A film counts for a country if its production and creative team come from there, if it is in a language spoken there, and if it is fiction. Animation is allowed. A film is used only once.</p>
        <dl>
          <dt><i style="background:var(--lvl-a)"></i>A</dt><dd>Sourced box office: the national film with the most admissions in the country, or failing that the highest national gross. Sources: Wikipedia lists, national film institutes, press.</dd>
          <dt><i style="background:var(--lvl-b)"></i>B</dt><dd>No published box office: the country’s most-rated film on TMDB, 50 votes minimum. This measures reputation more than local audience.</dd>
          <dt><i style="background:var(--lvl-c)"></i>C</dt><dd>Too little data: the first “native voice” pick of Films Around the World, an editorial selection.</dd>
          <dt><i style="background:var(--lvl-d)"></i>D</dt><dd>Last resort: the country’s most-rated film on TMDB, under 50 votes.</dd>
        </dl>
        <p>Records span eras: Poland and the UK have 1950s records counted in admissions, other countries recent records counted in revenue. About twenty picks were checked separately, and every manual call is explained in the data (notes are in French).</p>
        <p>Spotted a mistake or a better candidate? Data and code are on <a href="https://github.com/alexis-morain/one-film-per-country">GitHub</a>, sourced corrections are welcome.</p>`,
      credits: (d) => `Data: <a href="https://www.themoviedb.org/">TMDB</a> (films, posters, streaming via JustWatch), Wikipedia box office lists and national film institutes, <a href="https://filmsaroundthe.world/">Films Around the World</a> for editorial picks. Map: Natural Earth via world-atlas.${d ? ` Updated ${d}.` : ""} Code and data on <a href="https://github.com/alexis-morain/one-film-per-country">GitHub</a>.`,
    },
  };

  /* localStorage peut être absent ou refusé (navigation privée, stockage plein) */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignoré */ } },
  };
  function loadSeen() {
    try {
      const a = JSON.parse(store.get(STORE_SEEN) || "[]");
      return new Set(Array.isArray(a) ? a.filter((x) => typeof x === "string") : []);
    } catch { return new Set(); }
  }
  function initialLang() {
    const p = new URLSearchParams(location.search).get("lang");
    if (p === "fr" || p === "en") return p;
    const s = store.get(STORE_LANG);
    if (s === "fr" || s === "en") return s;
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language || "fr"];
    const first = langs.find((l) => /^(fr|en)\b/i.test(l));
    return first && first.toLowerCase().startsWith("en") ? "en" : first ? "fr" : "en";
  }

  const state = {
    lang: initialLang(),
    films: [], byIso: new Map(), updated: "",
    seen: loadSeen(),
    selected: null,
    filters: { q: "", levels: new Set(LEVELS), fr: false, anim: false, unseen: false },
  };
  let map; // {svg, g, zoom, path}

  const t = () => T[state.lang];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = (ms) => (reduced() ? 0 : ms);
  const isNarrow = () => window.matchMedia("(max-width: 900px)").matches;
  const $ = (id) => document.getElementById(id);

  const regionNames = {};
  const langNames = {};
  function countryName(iso) {
    const l = state.lang;
    regionNames[l] ??= new Intl.DisplayNames([l], { type: "region" });
    try { return regionNames[l].of(iso); } catch { return iso; }
  }
  function langName(code) {
    if (!code) return "";
    const l = state.lang;
    if (code === "zxx") return l === "fr" ? "sans dialogue" : "no dialogue";
    if (code === "fr/en") return l === "fr" ? "français et anglais" : "French and English";
    langNames[l] ??= new Intl.DisplayNames([l], { type: "language" });
    try { return langNames[l].of(LANG_FIX[code] || code); } catch { return code; }
  }
  function fmtValue(v) {
    // nombres entiers bruts ou avec séparateurs de milliers (« 17,616,661 », « 20 489 303 »)
    const s = String(v).trim();
    if (/^\d{4,}$/.test(s) || /^\d{1,3}([,.\s  ]\d{3})+$/.test(s)) {
      return Number(s.replace(/\D/g, "")).toLocaleString(state.lang === "fr" ? "fr-FR" : "en-US");
    }
    return s;
  }
  function fmtDate(iso) {
    const d = new Date(`${iso}T12:00:00`);
    if (!iso || Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(state.lang, { dateStyle: "long" }).format(d);
  }
  const filmTitle = (f) => (state.lang === "fr" ? f.title_fr : f.title_en) || f.title;
  const hasFilm = (f) => !!f.level;
  const levelBadge = (l) => `<b class="lv">${l}</b>`;

  /* ---------- Carte ---------- */
  function drawMap(world, nameToIso) {
    const svg = d3.select("#map");
    const box = svg.node().getBoundingClientRect();
    const width = box.width, height = box.height;
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const features = topojson.feature(world, world.objects.countries).features
      .filter((f) => f.properties.name !== "Antarctica");
    const byCcn3 = new Map(state.films.map((f) => [String(f.ccn3).padStart(3, "0"), f]));
    for (const ft of features) {
      const f = ft.id ? byCcn3.get(String(ft.id).padStart(3, "0")) : state.byIso.get(nameToIso[ft.properties.name]);
      ft.iso = f ? f.iso2 : null;
    }
    const projection = d3.geoEqualEarth().fitExtent([[8, 8], [width - 8, height - 8]], { type: "Sphere" });
    const path = d3.geoPath(projection);
    const g = svg.append("g");
    g.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" }));
    g.selectAll("path.country").data(features).join("path")
      .attr("class", "country").attr("d", path)
      .on("mousemove", (e, d) => showTip(e, d.iso))
      .on("mouseleave", hideTip)
      .on("click", (e, d) => d.iso && select(d.iso, { from: "map" }));

    // Pays absents ou minuscules sur la carte : un point à leurs coordonnées (seuil sur l’aire réelle, pas sur l’écran)
    const drawn = new Map();
    for (const ft of features) if (ft.iso) drawn.set(ft.iso, (drawn.get(ft.iso) || 0) + d3.geoArea(ft));
    const dots = state.films.filter((f) => f.latlng && (drawn.get(f.iso2) || 0) < MICRO_AREA);
    g.selectAll("circle.dot").data(dots).join("circle")
      .attr("class", "dot country").attr("r", 3)
      .attr("cx", (f) => projection([f.latlng[1], f.latlng[0]])[0])
      .attr("cy", (f) => projection([f.latlng[1], f.latlng[0]])[1])
      .on("mousemove", (e, f) => showTip(e, f.iso2))
      .on("mouseleave", hideTip)
      .on("click", (e, f) => select(f.iso2, { from: "map" }));

    const zoom = d3.zoom().scaleExtent([1, 12]).translateExtent([[0, 0], [width, height]])
      .on("zoom", (e) => {
        g.attr("transform", e.transform);
        g.selectAll("circle.dot").attr("r", 3 / Math.sqrt(e.transform.k));
      });
    svg.call(zoom).on("dblclick.zoom", null);
    map = { svg, g, zoom, path, width, height };
    d3.select("#zoom-in").on("click", () => svg.transition().duration(dur(250)).call(zoom.scaleBy, 1.6));
    d3.select("#zoom-out").on("click", () => svg.transition().duration(dur(250)).call(zoom.scaleBy, 1 / 1.6));
    d3.select("#zoom-reset").on("click", resetZoom);
    paintMap();
  }

  function resetZoom() {
    if (map) map.svg.transition().duration(dur(350)).call(map.zoom.transform, d3.zoomIdentity);
  }

  function paintMap() {
    if (!map) return;
    const visible = new Set(filtered().map((f) => f.iso2));
    map.g.selectAll(".country").each(function (d) {
      const iso = d.iso ?? d.iso2;
      const f = state.byIso.get(iso);
      const lvl = f && f.level ? f.level : "none";
      this.setAttribute("class", [
        this.tagName === "circle" ? "dot country" : "country", `lvl-${lvl}`,
        f && state.seen.has(iso) ? "seen" : "",
        f && f.level && !visible.has(iso) ? "dim" : "",
        iso && iso === state.selected ? "selected" : "",
      ].join(" ").trim());
      if (this.tagName === "circle") this.style.fill = state.seen.has(iso) ? "var(--accent)" : LEVEL_COLOR[f?.level || ""];
    });
    map.g.selectAll(".selected").raise();
  }

  const tip = () => $("tooltip");
  function showTip(e, iso) {
    const f = iso && state.byIso.get(iso);
    if (!f) return hideTip();
    const el = tip();
    const rect = document.querySelector(".screen").getBoundingClientRect();
    el.innerHTML = `<b>${esc(countryName(iso))}</b>${hasFilm(f) ? esc(filmTitle(f)) + (f.year ? ` (${esc(f.year)})` : "") : esc(t().levels[""])}`;
    el.hidden = false;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    el.style.left = Math.min(x + 14, rect.width - el.offsetWidth - 6) + "px";
    el.style.top = Math.max(y - el.offsetHeight - 10, 6) + "px";
  }
  function hideTip() { tip().hidden = true; }

  /* ---------- Ticket ---------- */
  // Film du jour : même film toute la journée (indice dérivé de la date), de niveau A avec affiche, non vu de préférence
  function dailyFilm() {
    const pool = state.films.filter((f) => f.level === "A" && f.poster);
    if (!pool.length) return null;
    const d = new Date();
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    const start = (day * 7919) % pool.length;
    for (let i = 0; i < pool.length; i++) {
      const f = pool[(start + i) % pool.length];
      if (!state.seen.has(f.iso2)) return f;
    }
    return pool[start];
  }

  function renderTicket({ animate = true } = {}) {
    const el = $("ticket");
    const L = t();
    const f = state.selected && state.byIso.get(state.selected);
    const body = (cls) => `<div class="ticket-body${animate ? "" : " still"}${cls ? ` ${cls}` : ""}">`;
    if (!f) {
      if (!state.films.length) { el.innerHTML = ""; return; }
      const day = dailyFilm();
      const daily = day ? `<section class="daily"><h3>${esc(L.daily)}</h3>
          <div class="daily-film">
            <img class="daily-poster" src="${IMG}w342${esc(day.poster)}" width="342" height="513" alt="${esc(L.posterOf(day.title))}">
            <div class="daily-txt">
              <p class="daily-cty">${esc(countryName(day.iso2))}</p>
              <p class="daily-title">${esc(filmTitle(day))}</p>
              <p class="meta">${esc(day.year || "")}</p>
              <button type="button" class="btn btn-primary" data-iso="${day.iso2}">${esc(L.dailyOpen)}</button>
            </div>
          </div></section>` : "";
      el.innerHTML = `${body("ticket-intro")}
        <h2>${esc(L.introTitle)}</h2><div class="block">${L.intro.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        ${daily}
        <div class="ticket-stub"><span>${esc(L.stub(state.films.length))}</span><span>${state.films.filter(hasFilm).length} films</span></div></div>`;
      return;
    }
    const idx = state.films.findIndex((x) => x.iso2 === f.iso2) + 1;
    const head = `<h2>${esc(countryName(f.iso2))}</h2>`;
    const stub = `<div class="ticket-stub"><span>${esc(L.continents[f.continent] || "")}</span><span>N° ${String(idx).padStart(3, "0")}</span></div>`;
    if (!hasFilm(f)) {
      el.innerHTML = `${body()}${head}<p class="block">${esc(L.noFilm)}</p>${f.note_fr ? `<p class="block note">${esc(f.note_fr)}</p>` : ""}${stub}</div>`;
      return;
    }
    const local = filmTitle(f);
    const poster = f.poster
      ? `<img class="poster" src="${IMG}w342${esc(f.poster)}" width="116" height="174" alt="${esc(L.posterOf(f.title))}" fetchpriority="high">`
      : `<div class="poster empty">${esc(L.noPoster)}</div>`;
    const meta = [f.year, langName(f.lang), f.runtime ? `${f.runtime} ${L.min}` : "", f.animation ? L.animation : "", f.runtime && f.runtime < 60 ? L.short : ""].filter(Boolean).join(" · ");
    const metricFn = L.metric[f.metric];
    const figure = metricFn ? metricFn(fmtValue(f.value)) : "";
    const overview = state.lang === "fr" ? f.overview_fr || f.overview_en : f.overview_en || f.overview_fr;
    const prov = Object.entries(f.providers_fr || {});
    const where = prov.length
      ? prov.map(([k, names]) => `<p>${esc(L.kinds[k] || k)}</p><div class="providers">${names.map((n) => `<span>${esc(n)}</span>`).join("")}</div>`).join("")
      : `<p class="note">${esc(L.nowhere)}</p>`;
    const links = [
      f.tmdb_id && [`https://letterboxd.com/tmdb/${f.tmdb_id}/`, "Letterboxd"],
      f.tmdb_id && [`https://www.themoviedb.org/movie/${f.tmdb_id}`, "TMDB"],
      f.imdb_id && [`https://www.imdb.com/title/${f.imdb_id}/`, "IMDb"],
      f.justwatch_fr && [f.justwatch_fr, "JustWatch"],
      f.source && !f.source.includes("themoviedb.org") && [f.source, L.source],
    ].filter(Boolean).map(([u, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join("");
    const alts = [
      f.tmdb_top && f.level !== "B" && f.level !== "D" && `<p><b>${esc(L.tmdbTop)}</b> : ${esc(f.tmdb_top)}</p>`,
      f.fatw && f.level !== "C" && `<p><b>${esc(L.fatw)}</b> : ${esc(f.fatw)}</p>`,
      f.video && `<p><b>${esc(L.video)}</b> : ${linkify(f.video)}</p>`,
    ].filter(Boolean).join("");
    const seen = state.seen.has(f.iso2);
    el.innerHTML = body() + head + `
      <div class="film">${poster}<div>
        <h3 lang="${esc(LANG_FIX[f.lang] || f.lang)}">${esc(f.title)}</h3>
        ${local && local.toLowerCase() !== f.title.toLowerCase() ? `<p class="alt-title">${esc(local)}</p>` : ""}
        <p class="meta">${esc(meta)}</p>
      </div></div>
      <div class="block"><h4>${esc(L.why)}</h4>
        ${figure ? `<p class="figure">${esc(figure)}</p>` : ""}
        <p class="level-tag"><i style="background:${LEVEL_COLOR[f.level]}"></i>${levelBadge(esc(f.level))} ${esc(L.levels[f.level])}</p>
        ${f.runner_up ? `<p class="note">${esc(L.runnerUp)} : ${esc(f.runner_up)}</p>` : ""}
      </div>
      ${overview ? `<div class="block"><h4>${esc(L.story)}</h4><p class="overview">${esc(overview)}</p></div>` : ""}
      <div class="block"><h4>${esc(L.where)}</h4>${where}</div>
      ${links ? `<div class="block"><h4>${esc(L.links)}</h4><p class="links">${links}</p></div>` : ""}
      ${alts ? `<div class="block note"><h4>${esc(L.alternatives)}</h4>${alts}</div>` : ""}
      ${f.note_fr ? `<div class="block"><h4>${esc(L.note)}</h4><p class="note" lang="fr">${esc(f.note_fr)}</p></div>` : ""}
      <label class="seen-toggle${seen ? " on" : ""}"><input type="checkbox" id="seen-box"${seen ? " checked" : ""}> ${esc(L.seen)}</label>
      ${stub}</div>`;
    el.querySelector("#seen-box").addEventListener("change", (e) => toggleSeen(f.iso2, e.target.checked));
    el.scrollTop = 0;
  }
  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  /* ---------- Catalogue ---------- */
  function filtered() {
    const { q, levels, fr, anim, unseen } = state.filters;
    const needle = q.trim().toLowerCase();
    return state.films.filter((f) => {
      if (!hasFilm(f) || !levels.has(f.level)) return false;
      if (fr && !Object.keys(f.providers_fr || {}).length) return false;
      if (anim && !f.animation) return false;
      if (unseen && state.seen.has(f.iso2)) return false;
      if (needle) {
        const hay = [countryName(f.iso2), f.title, f.title_fr, f.title_en].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }

  function renderGrid() {
    const L = t();
    const list = filtered();
    const grid = $("grid");
    const focusedIso = grid.contains(document.activeElement) ? document.activeElement.dataset?.iso : null;
    $("count").textContent = L.count(list.length);
    const groups = CONTINENTS.map((c) => [c, list.filter((f) => f.continent === c)]).filter(([, l]) => l.length);
    const collator = new Intl.Collator(state.lang);
    grid.innerHTML = groups.map(([c, l]) => {
      l.sort((a, b) => collator.compare(countryName(a.iso2), countryName(b.iso2)));
      return `<section class="continent"><div class="continent-head"><h3>${esc(L.continents[c])}</h3><span>${l.length}</span></div>
        <ul class="posters">${l.map((f) => `<li><button type="button" data-iso="${f.iso2}">
          <span class="img">${f.poster ? `<img src="${IMG}w185${esc(f.poster)}" width="185" height="278" alt="" loading="lazy">` : `<span class="noimg">${esc(f.title)}</span>`}
          <span class="lvl lvl-${f.level}" style="background:${LEVEL_COLOR[f.level]}" aria-hidden="true">${f.level}</span><span class="visually-hidden">${esc(L.reliability(f.level))}. </span>
          ${state.seen.has(f.iso2) ? `<span class="seen-mark">${esc(L.seenOn)}</span>` : ""}</span>
          <span class="cty">${esc(countryName(f.iso2))}</span><span class="ttl">${esc(filmTitle(f))}${f.year ? `, ${esc(f.year)}` : ""}</span>
        </button></li>`).join("")}</ul></section>`;
    }).join("");
    if (focusedIso) grid.querySelector(`button[data-iso="${focusedIso}"]`)?.focus({ preventScroll: true });
  }

  /* ---------- Actions ---------- */
  function announce(iso) {
    const f = state.byIso.get(iso);
    if (!f) return;
    $("announce").textContent = `${countryName(iso)} : ${hasFilm(f) ? filmTitle(f) : t().noFilm}`;
  }

  function select(iso, { from } = {}) {
    if (!state.byIso.has(iso)) return;
    state.selected = iso;
    history.replaceState(null, "", `#${iso}`);
    renderTicket();
    paintMap();
    announce(iso);
    const ticket = $("ticket");
    if (from === "grid" || from === "map") ticket.focus({ preventScroll: true });
    if (from !== "map" && map) focusCountry(iso);
    const narrow = isNarrow();
    if (narrow || from === "grid") {
      $(from === "grid" && !narrow ? "map" : "ticket").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    }
  }

  function deselect() {
    state.selected = null;
    $("announce").textContent = "";
    renderTicket();
    paintMap();
    resetZoom();
  }

  function focusCountry(iso) {
    const nodes = map.g.selectAll(".country").filter((d) => (d.iso ?? d.iso2) === iso).nodes();
    if (!nodes.length) return;
    let [[x0, y0], [x1, y1]] = [[Infinity, Infinity], [-Infinity, -Infinity]];
    for (const n of nodes) {
      const b = n.getBBox();
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    }
    const k = Math.max(1, Math.min(6, 0.35 / Math.max((x1 - x0) / map.width, (y1 - y0) / map.height)));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tr = d3.zoomIdentity.translate(map.width / 2, map.height / 2).scale(k).translate(-cx, -cy);
    map.svg.transition().duration(dur(600)).call(map.zoom.transform, tr);
  }

  function toggleSeen(iso, on) {
    on ? state.seen.add(iso) : state.seen.delete(iso);
    store.set(STORE_SEEN, JSON.stringify([...state.seen]));
    const top = $("ticket").scrollTop;
    renderProgress(); renderTicket({ animate: false }); renderGrid(); paintMap();
    $("ticket").scrollTop = top;
    $("seen-box")?.focus({ preventScroll: true });
  }

  let rolling = false;
  function randomPick() {
    if (rolling) return;
    const pool = state.films.filter((f) => hasFilm(f) && !state.seen.has(f.iso2) && f.iso2 !== state.selected);
    const list = pool.length ? pool : state.films.filter(hasFilm);
    const pick = () => list[Math.floor(Math.random() * list.length)].iso2;
    const target = pick();
    // onglet masqué : les minuteries sont ralenties à 1 s, l’animation durerait 10 s
    if (!map || document.hidden || reduced()) return select(target);
    // une dizaine de pays s’allument, de plus en plus lentement, puis le tirage se pose
    rolling = true;
    const btn = $("random");
    btn.setAttribute("aria-disabled", "true"); // pas `disabled` : le bouton garde le focus
    const delays = [60, 60, 70, 80, 95, 115, 140, 175, 220, 280];
    const flash = (iso) => map.g.selectAll(".country").classed("flash", (d) => (d.iso ?? d.iso2) === iso);
    let i = 0;
    const step = () => {
      if (i < delays.length) { flash(pick()); setTimeout(step, delays[i++]); return; }
      flash(null); rolling = false; btn.removeAttribute("aria-disabled"); select(target);
    };
    step();
  }

  function renderProgress() {
    $("progress").innerHTML = state.films.length ? t().progress(state.seen.size, state.films.filter(hasFilm).length) : "";
  }

  function renderStatic() {
    const L = t();
    document.documentElement.lang = state.lang;
    document.title = L.title;
    document.querySelectorAll("[data-i18n]").forEach((n) => { if (typeof L[n.dataset.i18n] === "string") n.textContent = L[n.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((n) => { n.placeholder = L[n.dataset.i18nPlaceholder]; });
    document.querySelectorAll("[data-i18n-label]").forEach((n) => { n.setAttribute("aria-label", L[n.dataset.i18nLabel]); });
    document.querySelectorAll(".lang-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
    $("zoom-in").setAttribute("aria-label", L.zoomIn);
    $("zoom-out").setAttribute("aria-label", L.zoomOut);
    $("legend").innerHTML = [...LEVELS, ""].map((l) =>
      `<li><i style="background:${LEVEL_COLOR[l]}"></i>${l ? `${levelBadge(l)} ` : ""}${esc(L.levels[l])}</li>`).join("")
      + `<li><i style="background:var(--accent)"></i>${esc(L.legendSeen)}</li>`;
    const lf = $("level-filter");
    lf.querySelectorAll("button").forEach((b) => b.remove());
    for (const l of LEVELS) {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.level = l; b.title = L.levels[l];
      b.setAttribute("aria-pressed", String(state.filters.levels.has(l)));
      b.innerHTML = `<i style="background:${LEVEL_COLOR[l]}"></i>${l}`;
      lf.appendChild(b);
    }
    $("method-body").innerHTML = L.method;
    $("credits").innerHTML = L.credits(fmtDate(state.updated));
    renderProgress();
  }

  function renderAll() { renderStatic(); renderTicket(); renderGrid(); paintMap(); }

  function bind() {
    $("random").addEventListener("click", randomPick);
    document.querySelectorAll(".lang-switch button").forEach((b) => b.addEventListener("click", () => {
      state.lang = b.dataset.lang; store.set(STORE_LANG, state.lang); renderAll();
    }));
    $("grid").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-iso]");
      if (b) select(b.dataset.iso, { from: "grid" });
    });
    $("ticket").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-iso]");
      if (b) select(b.dataset.iso, { from: "map" });
    });
    $("level-filter").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-level]");
      if (!b) return;
      const s = state.filters.levels;
      s.has(b.dataset.level) ? s.delete(b.dataset.level) : s.add(b.dataset.level);
      b.setAttribute("aria-pressed", String(s.has(b.dataset.level)));
      renderGrid(); paintMap();
    });
    $("filters").addEventListener("submit", (e) => e.preventDefault());
    let timer;
    $("q").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.filters.q = e.target.value; renderGrid(); paintMap(); }, 150);
    });
    for (const [id, key] of [["f-fr", "fr"], ["f-anim", "anim"], ["f-unseen", "unseen"]]) {
      $(id).addEventListener("change", (e) => { state.filters[key] = e.target.checked; renderGrid(); paintMap(); });
    }
    window.addEventListener("hashchange", () => {
      const iso = location.hash.slice(1).toUpperCase();
      if (!iso) { if (state.selected) deselect(); return; }
      if (iso !== state.selected) select(iso);
    });
  }

  // Langue et textes statiques tout de suite, avant le chargement des données
  renderStatic();

  Promise.all([fetch("data/films.json").then((r) => r.json()), fetch("data/world-50m.json").then((r) => r.json())])
    .then(([data, world]) => {
      state.films = data.films;
      state.updated = data.updated;
      state.byIso = new Map(data.films.map((f) => [f.iso2, f]));
      bind();
      renderStatic(); renderGrid();
      drawMap(world, data.name_to_iso);
      $("map-status").hidden = true;
      const iso = location.hash.slice(1).toUpperCase();
      if (state.byIso.has(iso)) select(iso); else renderTicket();
    })
    .catch(() => {
      const st = $("map-status");
      st.textContent = t().loadError;
      st.hidden = false;
    });
})();
