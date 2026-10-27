#!/bin/sh
# check-ef-deployed.sh — detecte la derive entre les Edge Functions du depot
# et celles reellement deployees sur le projet Supabase.
#
# POURQUOI CE SCRIPT EXISTE
#
# `supabase/functions/` n'est lu par AUCUN tsconfig, donc `pnpm -r typecheck`
# ne le voit jamais. Le depot contient 8 dossiers `fn-*`, mais le projet live
# n'en heberge que 5 (mesure 2026-10-24, cf. scripts/build-ef.mjs:12-22) :
#   ACTIVE   fn-agent-run, fn-import-course, fn-notifications, fn-skills, fn-dev-auth
#   ABSENT   fn-canvas, fn-integrations, fn-job-dispatcher
#
# Consequence mesuree : la file `public.job_queue` a 40 jobs bloques en
# `pending` depuis 2026-10-08 (20 `fsrs-tick` + 20 `skill_recompute`,
# `attempts = 0`) ; le cron `aurora_event_dispatch` POSTe vers
# `/functions/v1/fn-job-dispatcher` (migration 0028) et `net._http_response`
# renvoie 404 « Requested function was not found ». Voir le runbook
# docs/operations/2026-10-27-remediation-job-queue.md.
#
# Les gates existants (check-ef-imports.mjs, check-ef-bundles.mjs) prouvent que
# le code compile et que le bundle est self-contained — AUCUN ne compare a
# l'etat DEPLOYE. C'est le trou que ce script ferme.
#
# CE QU'IL FAIT
#
#   1. enumere les EF du depot (supabase/functions/fn-*/index.ts) ;
#   2. interroge l'API Supabase Management :
#        GET https://api.supabase.com/v1/projects/{ref}/functions
#      (docs: https://supabase.com/docs/reference/api/v1-list-all-functions) ;
#   3. compare les deux ensembles ;
#   4. sort en ECHEC (exit 1) si une EF du depot n'est pas deployee.
#
# VARIABLES D'ENV (jamais codees en dur — AD-3)
#
#   SUPABASE_ACCESS_TOKEN   REQUIS. Personal access token Supabase
#                           (https://supabase.com/dashboard/account/tokens).
#                           Le secret GitHub du meme nom (release.yml:181).
#                           JAMAIS dans le depot, JAMAIS loggue.
#   SUPABASE_PROJECT_REF    le project ref (ex. « opagfyspdbhxthlxvlrk »).
#                           A defaut, derive de SUPABASE_URL ou
#                           SUPABASE_URL_DEV (host -> premier label).
#   SUPABASE_API_BASE       OPTIONNEL. Defaut https://api.supabase.com.
#                           Surcoutable pour un test hors-ligne.
#
# USAGE
#   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... sh scripts/check-ef-deployed.sh
#
# EXIT
#   0  toutes les EF du depot sont deployees (les EF deployees hors depot
#      sont signalees en avertissement, non bloquantes) ;
#   1  DERIVE — au moins une EF du depot n'est pas deployee (message + nom) ;
#   2  NON VERIFIABLE — token/ref absents, API injoignable ou statut HTTP != 200.
#      (2, jamais 0 : « je n'ai pas pu verifier » n'est pas « tout va bien ».)

set -u

# ---- racine du depot -------------------------------------------------------
if [ -d "supabase/functions" ]; then
  REPO_ROOT="$(pwd)"
else
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
cd "$REPO_ROOT" || exit 2

EF_DIR="supabase/functions"
API_BASE="${SUPABASE_API_BASE:-https://api.supabase.com}"

if [ ! -d "$EF_DIR" ]; then
  echo "[check-ef-deployed] SKIP — $EF_DIR introuvable (rien a comparer)."
  exit 0
fi

# ---- 1. EF du depot --------------------------------------------------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

: > "$TMP/repo.txt"
for d in "$EF_DIR"/fn-*/; do
  [ -d "$d" ] || continue
  name="$(basename "$d")"
  [ -f "$d/index.ts" ] || continue
  printf '%s\n' "$name" >> "$TMP/repo.txt"
done
sort -o "$TMP/repo.txt" "$TMP/repo.txt"

if [ ! -s "$TMP/repo.txt" ]; then
  echo "[check-ef-deployed] SKIP — aucune EF fn-*/index.ts dans $EF_DIR."
  exit 0
fi

# ---- 2. config : token + project ref --------------------------------------
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "[check-ef-deployed] ECHEC — SUPABASE_ACCESS_TOKEN absent : impossible d'interroger l'API Management."
  echo "  Cree un token : https://supabase.com/dashboard/account/tokens"
  echo "  Puis : SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... sh scripts/check-ef-deployed.sh"
  exit 2
fi

REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$REF" ]; then
  # Derive the ref from a project URL host (first label) — the same
  # convention as .github/workflows/release.yml:234.
  for _url in "${SUPABASE_URL:-}" "${SUPABASE_URL_DEV:-}"; do
    [ -n "$_url" ] || continue
    REF="$(printf '%s' "$_url" | sed -E 's#^https?://([^.]+)\..*#\1#')"
    case "$REF" in
      ""|"$_url"|"https") REF="" ;;
      *) break ;;
    esac
  done
fi
if [ -z "$REF" ]; then
  echo "[check-ef-deployed] ECHEC — project ref introuvable : definis SUPABASE_PROJECT_REF (ou SUPABASE_URL)."
  exit 2
fi

# ---- 3. liste des EF deployees (API Management) ---------------------------
HTTP_CODE="$(curl -sS -o "$TMP/resp.json" -w '%{http_code}' \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  "$API_BASE/v1/projects/$REF/functions" 2>"$TMP/curl.err")"
CURL_RC=$?

if [ "$CURL_RC" -ne 0 ]; then
  echo "[check-ef-deployed] ECHEC — appel API impossible ($API_BASE) : $(cat "$TMP/curl.err")"
  exit 2
fi
if [ "$HTTP_CODE" != "200" ]; then
  echo "[check-ef-deployed] ECHEC — l'API Management a renvoye HTTP $HTTP_CODE (attendu 200)."
  echo "  Verifie SUPABASE_ACCESS_TOKEN (scope) et SUPABASE_PROJECT_REF=$REF."
  exit 2
fi

# Parse JSON -> un slug par ligne (slug, sinon name). node est une dep du depot.
node -e '
  let s = "";
  process.stdin.on("data", (d) => { s += d; });
  process.stdin.on("end", () => {
    let j;
    try { j = JSON.parse(s); } catch (e) {
      process.stderr.write("reponse JSON illisible: " + String(e) + "\n");
      process.exit(1);
    }
    const arr = Array.isArray(j) ? j : (Array.isArray(j.functions) ? j.functions : []);
    const slugs = arr.map((f) => (f && (f.slug || f.name)) || "").filter(Boolean);
    process.stdout.write(slugs.join("\n") + (slugs.length ? "\n" : ""));
  });
' < "$TMP/resp.json" > "$TMP/deployed.txt" || {
  echo "[check-ef-deployed] ECHEC — reponse API non exploitable."
  exit 2
}
sort -o "$TMP/deployed.txt" "$TMP/deployed.txt"

# ---- 4. comparaison --------------------------------------------------------
MISSING=""
while IFS= read -r name; do
  [ -n "$name" ] || continue
  grep -Fxq "$name" "$TMP/deployed.txt" || MISSING="$MISSING $name"
done < "$TMP/repo.txt"

EXTRA=""
while IFS= read -r name; do
  [ -n "$name" ] || continue
  grep -Fxq "$name" "$TMP/repo.txt" || EXTRA="$EXTRA $name"
done < "$TMP/deployed.txt"

repo_count="$(grep -c . "$TMP/repo.txt")"
deployed_count="$(grep -c . "$TMP/deployed.txt")"

if [ -n "$EXTRA" ]; then
  echo "[check-ef-deployed] AVERTISSEMENT — EF deployees hors depot (non bloquant) :$EXTRA"
fi

if [ -n "$MISSING" ]; then
  echo "[check-ef-deployed] DERIVE — $repo_count EF au depot, $deployed_count deployees ; MANQUANTES :$MISSING"
  for name in $MISSING; do
    echo "  - $name : presente dans $EF_DIR/$name/index.ts, absente du projet $REF"
  done
  echo "  Remediation : node scripts/build-ef.mjs && supabase functions deploy <nom>"
  echo "  Runbook : docs/operations/2026-10-27-remediation-job-queue.md"
  exit 1
fi

echo "[check-ef-deployed] OK — les $repo_count EF du depot sont deployees sur $REF."
exit 0
