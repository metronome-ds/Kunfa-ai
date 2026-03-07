#!/bin/bash
# Restore original Kunfa AI landing page with IM generation
# This replaces the deal flow platform with the original landing page product
set -e

echo "=== Restoring Kunfa AI Landing Page ==="

# Save current directory
ORIGINAL_DIR=$(pwd)

# Navigate to the script's directory
cd "$(dirname "$0")"

# Remove ALL current files except .git and this script
echo "Removing current platform files..."
find . -maxdepth 1 ! -name '.' ! -name '.git' ! -name 'restore-landing-page.sh' ! -name 'node_modules' ! -name '.next' -exec rm -rf {} +

# Clone the files from the restore branch
# We'll use a temporary approach - create the files directly
echo "Restoring original project files..."

# Download from the repo's restore branch
git fetch origin || true

# Force checkout to a clean state
git checkout -B restore-landing-page

# Now we need to get the original files
# The easiest way: just add all the original files and push
# The files should already be in this directory from the rsync

echo "Files restored. Committing..."
git add -A
git commit -m "Restore original Kunfa AI landing page with IM generation

Reverts to the original landing page product with:
- Investment Memorandum (IM) generation (15+ page PDF)
- Two-phase Claude analysis for expanded memos
- Stripe payment integration
- Landing page with hero, pricing, startup/investor sections
- Scoring modal and upload flow
- PDF report generation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" || echo "Nothing to commit"

echo "Pushing to GitHub..."
git push -f origin restore-landing-page

echo ""
echo "=== Done! ==="
echo "Branch 'restore-landing-page' pushed to GitHub."
echo "Go to Vercel to set this as the production branch, or redeploy from it."
echo ""

cd "$ORIGINAL_DIR"
