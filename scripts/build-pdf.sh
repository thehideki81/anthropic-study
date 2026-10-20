#!/usr/bin/env bash
# Build the optional single-file PDF study guide from the per-domain study docs.
# Thin wrapper over the md-to-pdf skill: it fixes the cover, title, file order
# (by exam weight: 1, 4, 3, 2, 5) and output path.
#
# Usage (from anywhere): bash scripts/build-pdf.sh
# Needs: Node (npx), perl, Google Chrome or Chromium (set CHROME_PATH if not found).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STUDY_DIR="$REPO/reference/study"
COVER="$REPO/.claude/skills/exam-study-builder/pdf-cover.md"
RENDER="$REPO/.claude/skills/md-to-pdf/render.sh"
OUT="$STUDY_DIR/Claude-Certified-Architect-Foundations-Study-Guide.pdf"

cd "$STUDY_DIR"
bash "$RENDER" \
  --out "$OUT" \
  --theme green \
  --title "Claude Certified Architect<br>— Foundations —" \
  --subtitle "Per-domain study material &middot; generated 2026-06-14 &middot; refreshed 2026-10-16" \
  --cover "$COVER" \
  domain-1-agentic-architecture.md \
  domain-4-prompt-engineering.md \
  domain-3-claude-code-config.md \
  domain-2-tool-design-mcp.md \
  domain-5-context-reliability.md

echo "Wrote $OUT"
