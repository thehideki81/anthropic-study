#!/bin/bash
# md-to-pdf: render one or more Markdown files into a single styled PDF.
#
# Mechanism: each .md -> HTML via `marked` (GFM tables/code), concatenated into
# one styled HTML doc with CSS @page rules + page breaks, then printed to PDF
# with headless Google Chrome. No pandoc/LaTeX required.
#
# Usage:
#   render.sh --out OUT.pdf [--title "T"] [--subtitle "S"] [--cover cover.md] \
#             [--theme green|slate] [--kicker "LABEL"] file1.md [file2.md ...]
#
# - --kicker sets the small uppercase label above the cover title
#   (default "Study Guide"; pass "" to omit).
#
# - Positional args are the body Markdown files, rendered in the given order,
#   each starting on a new page.
# - --cover renders a Markdown file as the first page; --title/--subtitle add a
#   centered banner above it. Passing --title alone makes a title-only cover.
# - Self-check answer lines ("  **A:**" indented under "- **Q:**") get a hard
#   line break so the answer renders on its own line (harmless if absent).
#
# Deps: npx (fetches `marked` on demand), perl, Google Chrome or Chromium (CHROME_PATH overrides).
set -euo pipefail

OUT="" ; TITLE="" ; SUBTITLE="" ; COVER="" ; THEME="slate" ; KICKER="Study Guide"
FILES=()
while [ $# -gt 0 ]; do
  case "$1" in
    --out)      OUT="$2"; shift 2 ;;
    --title)    TITLE="$2"; shift 2 ;;
    --subtitle) SUBTITLE="$2"; shift 2 ;;
    --cover)    COVER="$2"; shift 2 ;;
    --theme)    THEME="$2"; shift 2 ;;
    --kicker)   KICKER="$2"; shift 2 ;;
    -h|--help)  grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)         echo "Unknown option: $1" >&2; exit 2 ;;
    *)          FILES+=("$1"); shift ;;
  esac
done

[ -n "$OUT" ] || { echo "error: --out is required" >&2; exit 2; }
[ "${#FILES[@]}" -gt 0 ] || { echo "error: at least one Markdown file is required" >&2; exit 2; }

# Find Chrome/Chromium: $CHROME_PATH wins, then the usual macOS and Linux locations.
CHROME="${CHROME_PATH:-}"
if [ -z "$CHROME" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "/Applications/Chromium.app/Contents/MacOS/Chromium" \
           google-chrome google-chrome-stable chromium chromium-browser; do
    if [ -x "$c" ]; then CHROME="$c"; break; fi
    if command -v "$c" >/dev/null 2>&1; then CHROME="$(command -v "$c")"; break; fi
  done
fi
[ -n "$CHROME" ] && [ -x "$CHROME" ] || {
  echo "error: Chrome/Chromium not found. Install it or set CHROME_PATH=/path/to/chrome" >&2; exit 1; }

case "$THEME" in
  green) ACCENT="#0b3d2e"; ACCENT2="#14543f"; LINK="#0a7"; CODEBG="#eef2f0"; KICK="#0b5" ;;
  slate|*) ACCENT="#1f2d3d"; ACCENT2="#33475b"; LINK="#2563eb"; CODEBG="#eef1f4"; KICK="#2563eb" ;;
esac

WORK="$(mktemp -d /tmp/md2pdf.XXXXXX)"; mkdir -p "$WORK/frag"
trap 'rm -rf "$WORK"' EXIT

render_md () {  # $1 = md path, $2 = out html path
  perl -0777 -pe 's/(?<=\S)\n(?=  \*\*A:\*\*)/  \n/g' "$1" | npx -y marked > "$2"
}

# Render cover (if any) and body fragments
[ -n "$COVER" ] && render_md "$COVER" "$WORK/frag/cover.html"
i=0; for f in "${FILES[@]}"; do render_md "$f" "$WORK/frag/$i.html"; i=$((i+1)); done

{
cat <<HTMLHEAD
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${TITLE:-Document}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; line-height: 1.6; color: #1a1a1a; }
  h1 { font-size: 20pt; color: $ACCENT; border-bottom: 3px solid $ACCENT; padding-bottom: 6px; margin: 0 0 16px; }
  h2 { font-size: 14pt; color: $ACCENT; margin: 26px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 3px; page-break-after: avoid; }
  h3 { font-size: 12.5pt; color: $ACCENT2; margin: 22px 0 6px; padding-top: 6px; border-top: 1px dotted #cdd6d3; page-break-after: avoid; }
  p { margin: 7px 0; } p, li { font-size: 10.5pt; } li { margin: 4px 0; }
  strong { color: #111; }
  a { color: $LINK; text-decoration: none; word-break: break-all; }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9pt; background: $CODEBG; padding: 1px 4px; border-radius: 3px; color: $ACCENT; }
  pre { background: $CODEBG; padding: 10px 12px; border-radius: 5px; overflow-x: auto; font-size: 9pt; }
  pre code { background: none; padding: 0; }
  blockquote { color: #555; border-left: 3px solid #cdd; margin: 10px 0; padding: 6px 12px; font-style: italic; background: #f7f9f8; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9.5pt; }
  th, td { border: 1px solid #c8d0cd; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: $ACCENT; color: #fff; }
  tr:nth-child(even) td { background: #f4f7f6; }
  ul, ol { padding-left: 22px; margin: 8px 0; }
  p > strong:only-child { display: inline-block; margin-top: 6px; color: $ACCENT2; font-size: 11pt; }
  img { max-width: 100%; }
  .section { page-break-before: always; }
  .cover { page-break-after: always; padding-top: 40mm; text-align: center; }
  .cover .kicker { font-size: 11pt; letter-spacing: 2px; text-transform: uppercase; color: $KICK; }
  .cover h1 { font-size: 30pt; border: none; color: $ACCENT; margin: 12px 0; }
  .cover .sub { font-size: 13pt; color: #444; margin-bottom: 30mm; }
  .cover-body { text-align: left; }
  .cover-body h1 { display: none; }
</style></head><body>
HTMLHEAD

# Cover page
if [ -n "$COVER" ] || [ -n "$TITLE" ]; then
  echo '<div class="cover">'
  if [ -n "$TITLE" ]; then
    [ -n "$KICKER" ] && echo "  <div class=\"kicker\">$KICKER</div>"
    echo "  <h1>$TITLE</h1>"
  fi
  [ -n "$SUBTITLE" ] && echo "  <div class=\"sub\">$SUBTITLE</div>"
  if [ -n "$COVER" ]; then echo '  <div class="cover-body">'; cat "$WORK/frag/cover.html"; echo '  </div>'; fi
  echo '</div>'
  FIRST_BREAK=1   # cover already breaks; every body section breaks too
else
  FIRST_BREAK=0   # no cover: first body section must NOT add a leading blank page
fi

# Body sections
i=0; for _ in "${FILES[@]}"; do
  if [ "$i" -eq 0 ] && [ "$FIRST_BREAK" -eq 0 ]; then echo '<div>'; else echo '<div class="section">'; fi
  cat "$WORK/frag/$i.html"; echo '</div>'
  i=$((i+1))
done

echo '</body></html>'
} > "$WORK/combined.html"

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" "file://$WORK/combined.html" 2>"$WORK/chrome_err.txt" || {
    echo "Chrome failed to render PDF:" >&2; cat "$WORK/chrome_err.txt" >&2; exit 1; }

echo "PDF written: $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
