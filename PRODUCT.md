# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Site statique : HTML, CSS et JavaScript sans framework ni étape de build. d3 et topojson-client sont copiés dans `site/vendor/`, les polices sont hébergées sur le site. Déploiement par GitHub Pages depuis `site/`.

## Users

Deux publics, à égalité :
- Alexis et ses proches, qui font une soirée ciné par pays : ils tirent un pays, regardent son film, puis le cochent comme vu. Ils ouvrent le site sur ordinateur comme sur téléphone, et les deux doivent être aussi soignés.
- Les visiteurs venus de GitHub ou de Reddit, qui explorent la carte, découvrent des films et vérifient la méthode.

## Product Purpose

Montrer, pour chaque pays, le film national que ses habitants ont le plus vu, dans sa langue d'origine, et aider à le regarder. Le site est réussi si on peut choisir sa prochaine soirée en quelques secondes, et si un visiteur comprend tout de suite pourquoi chaque film a été choisi et à quel point ce choix est fiable.

## Positioning

Les autres listes « un film par pays » classent les films à la note ou à la réputation critique. Celle-ci classe à l'audience nationale (box-office) quand la donnée existe, et affiche le niveau de fiabilité de chaque choix (A, B, C, D) au lieu de faire comme si tous se valaient.

## Operating Context

- Soirée : le tirage au hasard, la fiche du film, l'endroit où le voir en France, puis la case « vu ». Le suivi reste dans le navigateur (localStorage), il n'y a pas de compte.
- Exploration : la carte, la grille d'affiches par continent, les filtres, la méthode.

## Capabilities and Constraints

- 199 pays et territoires, 196 films. Données dans `site/data/films.json`, produites par `scripts/export_site.py`.
- Bilingue français et anglais. Les notes d'arbitrage n'existent qu'en français.
- Affiches et fiches viennent de TMDB, avec la mention d'attribution obligatoire. Les plateformes de diffusion en France viennent de JustWatch, via TMDB.
- Les micro-États sans polygone visible sur la carte sont représentés par un point.

## Evidence on Hand

- Les données sourcées : niveau, critère, source et deuxième du classement pour chaque pays (`data/films_du_monde.json`).
- La méthode (`docs/methode.md`) et les arbitrages manuels (`data/overrides.json`).
- Aucune donnée d'usage ni aucun témoignage : n'en inventer aucun.

## Product Principles

1. Le niveau de fiabilité est toujours visible, jamais caché.
2. Chaque choix est traçable jusqu'à sa source.
3. On doit pouvoir passer de la carte au film en un clic, et du film à l'endroit où le voir.
4. Le suivi des soirées marche sans compte et sans rien envoyer à un serveur.

## Accessibility & Inclusion

Le contraste du texte respecte WCAG AA. La grille d'affiches est le chemin accessible au clavier, en plus de la carte.
