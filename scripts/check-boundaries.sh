#!/bin/sh
# Aurora — gardes d'architecture (surface réduite au socle, 2026-10-28).
#
# Trois greps, exécutés en CI ET en local. Chaque garde protège contre une
# erreur RÉELLEMENT commise dans ce dépôt, pas contre une faute théorique.
#
#   G1  secret dans le code           → identifiants dev en dur (incident 28/10)
#   G2  process.env côté client       → ReferenceError au démarrage (28/10)
#   G3  identité en dur               → un nom de personne dans le code produit
#
# Usage : sh scripts/check-boundaries.sh     (exit 0 = tout est vert)

set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FAIL=0
fail() { echo "  ✗ $1"; FAIL=1; }

echo "[G1] secrets en clair (clés, mots de passe, tokens)..."

# Préfixes de clés : ≥ 20 caractères après le préfixe, sinon on attrape des
# identifiants d'exemple (`sk-progress`) qui sont du faux positif.
if grep -rnE "(sk-[A-Za-z0-9]{20,}|sbp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,})" \
     "$ROOT/apps" "$ROOT/packages" \
     --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" 2>/dev/null \
     | grep -vE "(\.test\.|\.spec\.|node_modules|/dist/)"; then
  fail "clé d'API en clair dans le code"
fi

# Forme `'email@…': 'motdepasse'` — c'est exactement le bloc qui avait fuité.
if grep -rnE "'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'\s*:\s*'[^']{6,}'" \
     "$ROOT/apps" "$ROOT/packages" \
     --include="*.ts" --include="*.tsx" 2>/dev/null \
     | grep -vE "(\.test\.|\.spec\.|node_modules|/dist/)"; then
  fail "couple email/mot de passe en dur"
fi

echo "[G2] process.env dans le code client..."

# `process` n'existe pas dans un navigateur : la lecture lève au chargement du
# module, avant que React ne puisse se monter. Le bug du 2026-10-28 a coûté une
# coquille entièrement blanche. NODE_ENV est exempté (remplacé par Vite).
if grep -rnE "process\.env\." "$ROOT/apps/web/src" \
     --include="*.ts" --include="*.tsx" 2>/dev/null \
     | grep -v "process\.env\.NODE_ENV"; then
  fail "process.env dans apps/web/src — utiliser import.meta.env (VITE_*)"
fi

echo "[G3] identité en dur dans le code produit..."

if grep -rniE "(joy|horeb|joynagassi)[a-z]*@" "$ROOT/apps/web/src" \
     --include="*.ts" --include="*.tsx" 2>/dev/null; then
  fail "adresse identitaire en dur"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "[check-boundaries] OK — G1-G3 verts."
  exit 0
fi

echo "[check-boundaries] ÉCHEC — voir les lignes ci-dessus."
exit 1
