---
name: exam-guide-update
description: Install the "Claude Certified Architect – Foundations" exam guide (reference/instructor.pdf) for the first time, or replace it with a newer edition, compare the two editions, and update everything in this repo that depends on what changed (study index, exam format, domain weights, mock-exam structure). Use when the guide is missing, when the user has downloaded the exam guide or a new edition of it, asks whether the guide changed, or wants the repo brought up to date with the latest guide.
---

# exam-guide-update

You install the official exam guide into this repo (first install or a newer edition) and carry any changes through to the files that depend on it. All paths are relative to the repo root.

The guide lives at `reference/instructor.pdf`. It is **not** in the repo (it's gitignored, since the repo is public and doesn't redistribute Anthropic's document), so every user installs their own copy with this skill. Never commit it.

**First install** (no `reference/instructor.pdf` yet): do step 1, check the file is a PDF, copy it into place (step 3), then read its edition (version and last-updated date) with `pdftotext reference/instructor.pdf - | head -40` and compare it with the **Exam guide** line in `reference/study/INDEX.md`. If they match, tell the user it's installed and they're done. If the new edition is different, tell the user the study docs were built from another edition and offer to carry the changes through; without the old PDF there's nothing to diff against, so compare the new guide's exam details, domains, weights and task statements with `INDEX.md` and the Phase 1 table in `.claude/skills/exam-study-builder/SKILL.md`, then continue from step 4.

## 1. Get the new PDF

- If the user gave a path, use it.
- Otherwise look for the newest `~/Downloads/*Exam*Guide*.pdf` and confirm the file with the user before using it.
- If there's no file, tell the user to download the guide from the official course page, which needs their sign-in, then give you the path:
  https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification/486716

Check it really is a PDF (the first bytes are `%PDF`). A sign-in page saved as `.pdf` is the usual failure.

## 2. Compare the editions

```bash
python3 .claude/skills/exam-guide-update/compare.py reference/instructor.pdf <new.pdf>
```

It needs `pdftotext` (poppler). It reports the edition (version and last-updated date) of each, then changes in: the exam-details table, domains and weights, scenarios, task statements, and any other wording. Page furniture and line wrapping are normalized, so what it lists are real changes. If it says the files are identical, tell the user and stop.

Read the whole report before changing anything.

**Sharing restrictions:** if the new edition is marked confidential or restricts sharing (for example a "Confidential" or "Need to Know" footer), tell the user. It stays local either way, because the guide is never committed.

## 3. Install it

```bash
cp <new.pdf> reference/instructor.pdf
```

## 4. Carry the changes through

Always:

- In `reference/study/INDEX.md`, update the **Exam guide** line (version, last-updated date) and the **Exam format** section so it matches the guide's exam-details table.

Then, depending on what the report shows:

| What changed | Update |
|---|---|
| Exam details (number of questions, time, scenario count, scoring) | `INDEX.md` Exam format section, and the full-length option under "Exam structure" in `.claude/skills/exam-mock/SKILL.md` (question count, per-domain split, scenarios used). |
| Domain weights | `INDEX.md` domain table and "How to study" order, the Phase 1 table in `.claude/skills/exam-study-builder/SKILL.md`, the per-domain question split in `exam-mock/SKILL.md`, the weight in each `reference/study/domain-*.md` "Scope & exam weight" section, and the file order in `scripts/build-pdf.sh` (it's ordered by weight). |
| Scenarios | The scenario list in `INDEX.md` and `exam-mock/SKILL.md`. |
| Task statements (added, removed, renamed, new "Knowledge of" / "Skills in" bullets) | The `DOMAINS` list in `.claude/skills/exam-study-builder/build-workflow.js` and the Phase 1 table. The study docs then need a refresh for the affected domains: tell the user and offer `/exam-study-builder`. Don't run it unasked; it's a long, token-heavy research run. |
| Wording only | Nothing beyond the always-steps. Say so. |

Keep a per-domain question split that sums exactly to its total, and round so the larger domains get the extra question.

## 5. Report

Tell the user, in your own words: the old and new editions, what changed in the guide, what you updated in the repo, and whether the study docs need a refresh. Then remind them nothing is committed yet; commit only if they ask.

## Rules

- Summarize changes in your own words. Never copy the guide's sample questions or their answers into any file in this repo; the study docs and mock exams must stay original.
- Don't edit the guide's content, keep extra copies of it, or commit it. Only the current edition is kept locally; if the user wants the old one for reference, suggest they keep their own copy before you replace it.
