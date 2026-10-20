# CCA Study Kit

Study tools for the **Claude Certified Architect – Foundations** exam, run inside [Claude Code](https://code.claude.com). Clone the repo, start Claude Code in it, and you get:

| Command | What it does |
|---|---|
| `/exam-mock` | Generates a fresh, domain-weighted practice exam from the study docs and runs it one question at a time. |
| `/exam-guide-update` | Maintainer tool: installs a new edition of the exam guide, reports what changed, and updates the repo to match. |
| `/exam-study-builder` | Maintainer tool: rebuilds or refreshes the study docs from the exam guide and the live Anthropic docs. |
| `/md-to-pdf` | Turns Markdown files into a styled PDF (used to build the optional study-guide PDF). |

The study material itself is in [`reference/study/`](reference/study/INDEX.md): one cited doc per exam domain, readable on its own in any Markdown viewer.

> These tools are for **practice only**. Never use them during the real certification exam.

## Setup

### 1. Requirements

- **Claude Code**, signed in. Check with `claude --version`.
- **git**
- **Python 3** (standard library only, nothing to `pip install`), used by `/exam-guide-update`. macOS and most Linux distributions already have it: check with `python3 --version`.

The following are optional and only needed to build the PDF, update the exam guide, or rebuild the study docs:

- Node.js (for `npx`), `perl`, and Google Chrome or Chromium. These build the PDF.
- `pdftotext` from poppler, used to read the exam guide when updating it or rebuilding the docs: `brew install poppler` on macOS, `sudo apt install poppler-utils` on Debian/Ubuntu.

### 2. Clone

```bash
git clone <this-repo-url>
cd <repo-folder>
```

### 3. The exam guide

The official exam guide is **not** included in this repo. The study docs were built from version 0.2 (last updated 2026-06-30), and you don't need the guide to study with `/exam-mock`. You need it only to update the guide or rebuild the study docs.

To install it, download it from the official course page (sign-in required):
<https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification/486716>

Then run `/exam-guide-update` in Claude Code. It finds the downloaded PDF (or ask it to use a specific path), installs it at `reference/instructor.pdf` (gitignored, so it's never committed), and tells you whether it's the edition the study docs were built from. Run it again whenever Anthropic publishes a new edition: it compares the two and updates everything in the repo that depends on what changed.

### 4. Start studying

Start Claude Code **from the repo root**. The skills read files using paths relative to the repo root.

```bash
cd <repo-folder>
claude
```

Then type, for example:

```
/exam-mock practice mode, 30 questions
```

The skills are project skills in `.claude/skills/`, so they only appear when Claude Code runs inside this folder. Nothing is installed in your home directory.

## Using the mock exam

- **Length:** the default is 20 questions. Ask for any number, e.g. "30 questions", or a single domain ("just Domain 2"). Ask for a *full-length* mock to get the real format: 60 questions across 4 of the 6 scenarios. Time yourself; the real exam allows 120 minutes.
- **Modes:** *practice* gives feedback after every answer. *Exam conditions* gives no feedback until the end.
- **While answering:** type `a`–`d` to answer. `explain` explains the last question in more depth, `change Q3 to b` changes an earlier answer, `skip` skips the current question (practice mode only, since the real exam requires an answer to every question), and `stop` ends the exam and scores it.
- **The final report** gives your score per domain, explains every miss, and points out patterns across your mistakes. Then you can ask for a second round built only from what you missed.

Questions are generated new each time, so retaking a mock gives you different questions.

## Optional: build the PDF

```bash
bash scripts/build-pdf.sh
```

This writes `reference/study/Claude-Certified-Architect-Foundations-Study-Guide.pdf`, which isn't committed. If Chrome isn't found automatically, set `CHROME_PATH=/path/to/chrome`.

## Keeping the docs current (maintainers)

Anthropic's docs change quickly (model IDs, defaults, limits), so the study docs carry a "refreshed" date. To refresh them:

1. If there's a new exam guide, install it first with `/exam-guide-update` (step 3 above). It tells you whether the syllabus changed.
2. In Claude Code, run `/exam-study-builder` and ask it to refresh the docs. It re-checks each fact against the live docs and writes a dated `reference/study/CHANGES-<date>.md`.
3. Review the diff and commit it. Colleagues get the update with `git pull`.

## Layout

```
.claude/skills/
  exam-guide-update/    installs a new exam guide edition (maintainers)
  exam-mock/            practice exam generator
  exam-study-builder/   study-doc builder (maintainers)
  md-to-pdf/            Markdown → PDF renderer
reference/
  study/                the study docs (INDEX.md + one per domain + changelog)
  instructor.pdf        the official exam guide (you install it; gitignored)
scripts/
  build-pdf.sh          build the optional PDF
```

## Troubleshooting

- **`/exam-mock` doesn't show up:** make sure you started `claude` inside the repo folder, not a parent folder.
- **"study docs not found":** you're probably running from a subfolder. Restart Claude Code from the repo root.
- **`/exam-guide-update` says the download isn't a PDF:** the course page saved a sign-in page instead. Sign in, download the guide again, and pass that file.
- **PDF build can't find Chrome:** set `CHROME_PATH`, e.g. `CHROME_PATH=$(which chromium) bash scripts/build-pdf.sh`.
