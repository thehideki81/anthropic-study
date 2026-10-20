---
name: md-to-pdf
description: Render one or more Markdown files into a single, nicely styled PDF — with an optional cover page, a title banner, page breaks between files, and GFM tables/code. Use when the user wants to turn Markdown docs (notes, study material, reports, a set of docs) into a polished standalone PDF. No pandoc or LaTeX required.
---

# md-to-pdf

Convert Markdown into a polished PDF with no heavyweight toolchain (macOS or Linux). The
mechanism is: render each Markdown file to HTML with **`marked`** (handles
GitHub-flavored tables and code), concatenate the fragments into one styled HTML
document (CSS `@page` rules, page breaks, an optional cover), then print to PDF
with **headless Google Chrome**.

Use this whenever the user asks to "make a PDF", "export these docs", "combine
these markdown files into a PDF", or similar.

## Prerequisites

- **Google Chrome or Chromium** (used headless for `--print-to-pdf`). Found automatically on macOS and Linux; set `CHROME_PATH` to override.
- **`npx`** (Node) — fetches `marked` on demand; no global install needed.
- **`perl`** — preinstalled on macOS and most Linux distributions.

If Chrome is missing, the script errors clearly. Pandoc/LaTeX are NOT required;
do not reach for them unless this approach is unavailable.

## Usage

```bash
bash render.sh --out OUT.pdf [--title "T"] [--subtitle "S"] [--cover cover.md] \
               [--theme green|slate] [--kicker "LABEL"] file1.md [file2.md ...]
```

- **Positional args** = the body Markdown files, rendered in the order given, each starting on a new page.
- **`--out`** (required) — output PDF path.
- **`--cover FILE.md`** — rendered as page 1. Combine with `--title`/`--subtitle` for a banner above the cover content. `--title` alone makes a title-only cover.
- **`--theme`** — `slate` (default, neutral professional) or `green`.
- **`--kicker`** — small uppercase label above the cover title (default "Study Guide"; pass `""` to omit).
- A standalone PDF should not reference the source files. If a cover/index links to the `.md` files for on-disk navigation, make a **separate cover** without those links for the PDF (see `scripts/build-pdf.sh` for an example).

### Example

```bash
bash .claude/skills/md-to-pdf/render.sh \
  --out ~/report.pdf --title "Q2 Report" --subtitle "2026-06-14" \
  --cover summary.md section-1.md section-2.md
```

## Styling notes

- Headings, tables, fenced code, blockquotes, and lists are all styled for print.
- Self-check Q/A: an indented `  **A:**` line under a `- **Q:**` bullet gets a hard line break so the answer renders on its own line. This is harmless for documents without that pattern.
- To change fonts/colors/margins, edit the inline `<style>` block in `render.sh`.

## Verifying output

After rendering, sanity-check the result rather than assuming success:
- Confirm the file exists and is a valid PDF (`file OUT.pdf`).
- Read back the first page or two (the cover) and a content page to confirm tables, code, and page breaks render as intended.
