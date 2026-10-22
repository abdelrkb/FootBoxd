#!/bin/sh
# Prépare une branche de hotfix à partir du tag actuellement en prod, sans embarquer le
# contenu non livré de `main` — voir RELEASE.md section "Hotfix en prod".
#
# Usage : scripts/hotfix.sh <tag-en-prod> <nouveau-tag>
#   scripts/hotfix.sh v1.3.0 v1.3.1
set -eu

BASE_TAG="${1:-}"
NEW_TAG="${2:-}"

usage() {
  echo "Usage: $0 <tag-en-prod> <nouveau-tag>" >&2
  echo "  ex:   $0 v1.3.0 v1.3.1" >&2
  exit 1
}

[ -n "$BASE_TAG" ] && [ -n "$NEW_TAG" ] || usage

for tag in "$BASE_TAG" "$NEW_TAG"; do
  case "$tag" in
    v[0-9]*.[0-9]*.[0-9]*) ;;
    *) echo "Tag invalide : '$tag' (format attendu vX.Y.Z)" >&2; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."

git fetch --tags
git checkout -b "hotfix/${NEW_TAG}" "$BASE_TAG"

cat <<EOF

Branche hotfix/${NEW_TAG} créée à partir de ${BASE_TAG}.

Prochaines étapes :
  1. Corriger, tester.
  2. git commit -am "fix: ..."
  3. git push -u origin hotfix/${NEW_TAG}
  4. Ouvrir une PR hotfix/${NEW_TAG} (label "hotfix"), sans la merger dans main tout de suite.
  5. Releases -> Draft a new release -> tag ${NEW_TAG}, cible : hotfix/${NEW_TAG} -> Publish.
  6. Reporter le correctif dans main (merge ou cherry-pick) pour ne pas le perdre.
EOF
