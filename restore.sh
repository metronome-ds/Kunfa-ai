#!/bin/bash
# ============================================
# Restore Kunfa AI Landing Page + IM Generation
# ============================================
# This script replaces the deal flow platform with
# the original landing page + Investment Memo product.
# Run from inside your kunfa-ai folder.
set -e

echo ""
echo "=== Restoring Kunfa AI Landing Page ==="
echo ""

# Make sure we're in the right directory
if [ ! -d "_restore" ]; then
    echo "ERROR: _restore directory not found. Run this from your kunfa-ai folder."
    exit 1
fi

# Step 1: Remove new platform files
echo "[1/5] Removing new platform files..."
rm -rf src/ supabase/ vercel.json next.config.ts .env.local
rm -f deploy.sh fix-deploy.sh restore-landing-page.sh
rm -rf kunfa-report-update/ kunfa-report-expansion.patch expanded-memo-addition.ts new-pdf.ts

# Step 2: Copy original project files
echo "[2/5] Restoring original project files..."
cp -r _restore/* .
cp _restore/.eslintrc.json . 2>/dev/null || true
cp _restore/.gitignore . 2>/dev/null || true
cp _restore/.env.local.example . 2>/dev/null || true

# Step 3: Clean up
echo "[3/5] Cleaning up..."
rm -rf _restore
rm -f restore.sh

# Step 4: Commit
echo "[4/5] Committing changes..."
git add -A
git commit -m "Restore original Kunfa AI landing page with IM generation

Reverts to the original landing page product with:
- Investment Memorandum (IM) generation (15+ page PDF)
- Two-phase Claude analysis for expanded memos
- Stripe payment integration
- Landing page with hero, pricing, startup/investor sections
- Scoring modal and upload flow
- PDF report generation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Step 5: Push
echo "[5/5] Pushing to GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
git push -f origin "$CURRENT_BRANCH"

echo ""
echo "=== DONE! ==="
echo "Original landing page restored and pushed to branch: $CURRENT_BRANCH"
echo "Vercel should auto-deploy from this branch."
echo ""
echo "Your site will be back at: https://kunfa-ai.vercel.app"
echo ""
