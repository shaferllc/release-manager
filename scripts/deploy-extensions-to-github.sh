#!/usr/bin/env bash
set -euo pipefail

ORG="shaferllc"
EXT_DIR="/Users/tomshafer/Projects/Apps/release-manager/extracted-extensions"
GH="command gh"

cd "$EXT_DIR"

for dir in shipwell-ext-*; do
  [ -d "$dir" ] || continue
  ext_name="$dir"
  repo_name="$ORG/$ext_name"

  echo ""
  echo "=========================================="
  echo "  Processing: $ext_name"
  echo "=========================================="

  cd "$EXT_DIR/$dir"

  # 1. npm install
  echo "  [1/6] npm install..."
  npm install --silent 2>&1 || true

  # 2. npm run build
  echo "  [2/6] Building..."
  if ! npm run build 2>&1; then
    echo "  !! BUILD FAILED for $ext_name — skipping"
    cd "$EXT_DIR"
    continue
  fi

  # 3. Verify dist/index.js exists
  if [ ! -f "dist/index.js" ]; then
    echo "  !! No dist/index.js — skipping"
    cd "$EXT_DIR"
    continue
  fi

  # 4. Init git
  echo "  [3/6] Initializing git..."
  if [ ! -d ".git" ]; then
    git init -b main --quiet
    git add -A
    git commit -m "Initial release" --quiet
  fi

  # 5. Create GitHub repo (skip if exists)
  echo "  [4/6] Creating GitHub repo $repo_name..."
  if $GH repo view "$repo_name" &>/dev/null; then
    echo "  Repo already exists, skipping creation."
  else
    $GH repo create "$repo_name" --public --source=. --push --description "Shipwell extension: $ext_name" 2>&1 || true
  fi

  # 5b. Make sure remote is set and push
  if ! git remote get-url origin &>/dev/null; then
    git remote add origin "https://github.com/$repo_name.git"
  fi
  echo "  [5/6] Pushing to GitHub..."
  git push -u origin main --force 2>&1 || true

  # 6. Create release with dist/index.js
  echo "  [6/6] Creating release v1.0.0..."
  if $GH release view v1.0.0 --repo "$repo_name" &>/dev/null; then
    echo "  Release v1.0.0 already exists, deleting and recreating..."
    $GH release delete v1.0.0 --repo "$repo_name" --yes 2>&1 || true
  fi
  $GH release create v1.0.0 \
    --repo "$repo_name" \
    --title "v1.0.0" \
    --notes "Initial release of $ext_name" \
    dist/index.js 2>&1 || true

  echo "  DONE: https://github.com/$repo_name"
  cd "$EXT_DIR"
done

echo ""
echo "All extensions processed."
