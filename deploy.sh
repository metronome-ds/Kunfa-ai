#!/bin/bash
# Kunfa AI - Deploy Script
# Run this from the kunfa-ai directory on your Mac

set -e

echo "🚀 Deploying Kunfa AI..."

# Fix git lock file if it exists
rm -f .git/index.lock 2>/dev/null || true

# Stage all files
git add -A

# Commit
git commit -m "Fresh start: Kunfa AI deal flow intelligence platform

Complete rebuild with Next.js 16 + React 19 + Supabase + Claude AI:
- Dashboard with pipeline, portfolio, team, and deal management
- AI-powered deal scoring, company briefs, and term sheet analysis
- LBO calculator, valuation calculator, DD checklist
- Supabase auth (email + LinkedIn)
- Document upload and parsing
- Deal flow pipeline (kanban)"

# Add remote if not already set
git remote get-url origin 2>/dev/null || git remote add origin https://github.com/metronome-ds/Kunfa-ai.git

# Force push to the branch Vercel is watching
git push -f origin main:claude/setup-remote-repo-CpcW1

echo ""
echo "✅ Pushed! Vercel will auto-deploy from branch claude/setup-remote-repo-CpcW1"
echo "🔗 Check: https://vercel.com/metronomes-projects/kunfa-ai"
