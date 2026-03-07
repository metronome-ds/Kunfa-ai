#!/bin/bash
# Fix: remove old report files that break the build
set -e

echo "🔧 Fixing build error..."

# Remove git lock if stuck
rm -f .git/index.lock 2>/dev/null || true

# Remove the old files from git tracking
git rm -r --cached kunfa-report-update/ 2>/dev/null || true
git rm --cached kunfa-report-expansion.patch 2>/dev/null || true
git rm --cached deploy.sh 2>/dev/null || true

# Stage the updated .gitignore
git add .gitignore

# Commit and push
git commit -m "Fix build: remove old report files that reference missing @react-pdf/renderer"
git push -f origin main:claude/setup-remote-repo-CpcW1

echo ""
echo "✅ Fix pushed! Vercel will rebuild automatically."
echo "🔗 Check: https://vercel.com/metronomes-projects/kunfa-ai"
