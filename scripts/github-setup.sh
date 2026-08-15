#!/usr/bin/env bash
# One-time GitHub setup for oia-5302-demo
set -euo pipefail

echo "=== OIA 5302 GitHub Setup ==="
echo ""

if ! command -v gh >/dev/null 2>&1; then
  echo "Installing GitHub CLI..."
  brew install gh
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Please log in to GitHub (browser will open):"
  gh auth login
fi

USERNAME="$(gh api user -q .login)"
echo "GitHub user: $USERNAME"

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin already set."
else
  read -rp "Create private repo oia-5302-demo? [Y/n] " ans
  ans="${ans:-Y}"
  if [[ "$ans" =~ ^[Yy] ]]; then
    gh repo create oia-5302-demo --private --source=. --remote=origin --push
    git push origin v0.1.0 2>/dev/null || git tag -a v0.1.0 -m "S0-S8 prototype" && git push origin v0.1.0
    echo "Done: https://github.com/$USERNAME/oia-5302-demo"
    exit 0
  fi
fi

git push -u origin main
git push origin v0.1.0 2>/dev/null || true
echo "Done: https://github.com/$USERNAME/oia-5302-demo"
