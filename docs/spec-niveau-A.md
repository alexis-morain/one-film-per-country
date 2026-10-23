# Spec recherche niveau A : film national le plus vu dans son pays

Objectif : pour chaque pays souverain de la région assignée, trouver le film
NATIONAL qui a fait le plus d'entrées en salles DANS CE PAYS (box-office domestique).

## Règles

- Film national : production et équipe créative principalement du pays (pas
  seulement financé ou tourné là). Coproduction acceptée si le pays est le
  pays créatif principal.
- Langue : une langue parlée dans le pays (langue officielle ou régionale).
  Exclure les films tournés en anglais pour l'export, sauf pays anglophones.
- Long-métrage de fiction. Animation ACCEPTÉE (la noter). Pas de documentaire.
- Critère de classement : entrées domestiques en priorité ; à défaut, recettes
  domestiques en monnaie locale. Ne PAS utiliser les recettes mondiales.
- Ignorer les films étrangers (Hollywood, Inde…) même s'ils dominent le
  classement local : on veut le premier film NATIONAL.
- Sources fiables : Wikipedia « List of highest-grossing films in X » ou
  « List of highest-grossing X films », instituts nationaux (CNC, KOFIC, FFA,
  ICAA, Ancine, IMCINE, Lumiere/European Audiovisual Observatory pour l'Europe,
  base LUMIERE : https://lumiere.obs.coe.int), presse spécialisée.
- Ne couvre que les pays où une donnée sourcée existe. Pour les autres, mets
  "level": "none" avec une note courte (ex. « pas de box-office suivi »).
  Ne devine jamais un chiffre.

## Sortie

Écris un fichier JSON (tableau) au chemin indiqué dans ta mission, un objet par
pays souverain de la région, y compris ceux sans donnée :

```json
{
  "iso2": "FR",
  "country": "France",
  "level": "A",               // "A" si donnée sourcée, "none" sinon
  "title_original": "Bienvenue chez les Ch'tis",
  "title_en": "Welcome to the Sticks",
  "year": 2008,
  "language": "fr",           // ISO 639-1
  "animation": false,
  "metric": "admissions",     // "admissions" ou "domestic_gross"
  "value": "20 489 303",      // tel que dans la source
  "source_url": "https://...",
  "runner_up": "Intouchables (2011)",  // le 2e, utile pour arbitrer
  "note": "courte remarque si ambiguïté (ex. film ancien mal documenté)"
}
```

Le fichier doit être du JSON valide (pas de commentaires). Réponds à la fin
par un résumé : nombre de pays niveau A, pays ambigus.
