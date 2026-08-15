#!/usr/bin/env bash
# End-of-day helper — usually run by Cursor Agent after writing the daily log.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATE="${1:-$(TZ=Asia/Shanghai date +%Y-%m-%d)}"
LOG="docs/daily-logs/${DATE}.md"

echo "=== OIA 5302 End of Day · ${DATE} ==="
echo ""

if [[ ! -f "$LOG" ]]; then
  echo "⚠ Daily log not found: $LOG"
  echo "  Ask Cursor: 收工"
  exit 1
fi

echo "Syncing Cursor conversation index..."
npm run progress:sync 2>/dev/null || node scripts/sync-conversation-progress.mjs || true

echo "Daily log: $LOG"
echo ""
echo "--- Git status ---"
git status --short
echo ""

if git diff --quiet && git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git add docs/daily-logs/ docs/progress/ CHANGELOG.md VERSION 2>/dev/null || true
  git add -A
  git commit -m "docs: daily log ${DATE}" || true
fi

if git remote get-url origin >/dev/null 2>&1; then
  if git push origin main; then
    echo ""
    echo "✓ Pushed to origin/main"
    git remote get-url origin
  else
    echo ""
    echo "✗ Push failed — run: git push origin main"
    echo "  Or first-time setup: ./scripts/github-setup.sh"
  fi
else
  echo ""
  echo "No git remote. Run once: ./scripts/github-setup.sh"
fi

echo ""
echo "Other machines: git pull origin main"
