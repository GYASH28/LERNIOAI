#!/usr/bin/env bash
# ============================================================
# Lernio AI — Push to GitHub + Deploy to Vercel
# ============================================================
# Run this script from your local machine (NOT the agent env).
# It requires:
#   1. Git remote `origin` pointing to github.com/GYASH28/LERNIOAI.git
#   2. GitHub auth (SSH key or PAT in git credential helper)
#   3. Vercel CLI installed: npm i -g vercel
#   4. Vercel auth: vercel login (one-time)
#
# Usage:
#   bash scripts/push-and-deploy.sh           # push + deploy
#   bash scripts/push-and-deploy.sh --push    # push only
#   bash scripts/push-and-deploy.sh --deploy  # deploy only
# ============================================================

set -e

BRANCH="fix/audit-remediation-v2"
REMOTE="origin"

cd "$(dirname "$0")/.." || exit 1

echo "=== Lernio AI deploy helper ==="
echo "Branch: $BRANCH"
echo "Remote: $REMOTE"
echo ""

# --- Push ---
if [[ "$1" == "--push" || "$1" == "" ]]; then
  echo "▶ Pushing to GitHub ($REMOTE/$BRANCH)..."
  git push "$REMOTE" "$BRANCH"
  echo "✓ Pushed."
  echo ""
  echo "  → View on GitHub: https://github.com/GYASH28/LERNIOAI/tree/$BRANCH"
  echo ""
fi

# --- Deploy ---
if [[ "$1" == "--deploy" || "$1" == "" ]]; then
  echo "▶ Deploying to Vercel..."
  echo "  (Vercel auto-deploys on push if the project is linked to your GitHub repo.)"
  echo ""
  echo "  Option A — auto-deploy (recommended):"
  echo "    Just push to GitHub — Vercel will build & deploy automatically."
  echo "    Watch progress: https://vercel.com/dashboard"
  echo ""
  echo "  Option B — manual deploy from CLI:"
  echo "    npx vercel --prod"
  echo ""
  echo "  After deploy, apply the new DB migration:"
  echo "    npx prisma migrate deploy   # run with DATABASE_URL pointing to production"
  echo "    # OR"
  echo "    npm run db:deploy:migrations"
  echo ""
  echo "✓ Done."
fi
