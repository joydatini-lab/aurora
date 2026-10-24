# ADR-INT-002 — Web-first (pointeur)

> **Cet ADR n'a pas de contenu propre.** La décision « web d'abord, puis desktop,
> puis mobile » est **ACTÉE par le owner le 2026-10-24** et **rédigée** dans :

## → [`docs/architecture/adr-018-direction-plateforme-web-first.md`](../architecture/adr-018-direction-plateforme-web-first.md)

**Pourquoi ce fichier existe.** La porte de sortie de la Phase 0
(`docs/plans/2026-10-24-redefinition-priorites.md` §1.2) attendait un livrable au
chemin `docs/adr/ADR-INT-002-web-first.md`. La décision a été écrite sous le nom
`adr-018`, à l'emplacement `docs/architecture/`. Plutôt que de **dupliquer** la
décision — ce qui créerait deux sources de vérité, précisément ce que le dépôt
interdit (`AI_RULES.md` §2, AD-6) — ce fichier est un **pointeur**.

**Règle :** toute modification de la décision web-first se fait **dans
`adr-018`**, jamais ici. Ce fichier ne doit pas accumuler de contenu.
