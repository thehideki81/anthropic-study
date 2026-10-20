---
name: exam-study-builder
description: Build per-domain study material for the "Claude Certified Architect – Foundations" certification by extracting the exam guide's syllabus from the reference PDF and running a deep research pass per domain against authoritative Anthropic documentation. Produces one cited study doc per domain plus an index. Use when the user wants to create or refresh source material for studying the exam.
---

# exam-study-builder

You generate study source material for the **Claude Certified Architect – Foundations** exam. You read the official exam guide PDF to recover the full syllabus, then run a deep research pass per content domain and write one self-contained, cited study document per domain.

This is a study-prep authoring tool, not an answer key. It works entirely from the exam guide PDF and public documentation — it never touches any live exam.

## Inputs and outputs

- **Source PDF (authoritative syllabus):** `reference/instructor.pdf` (the official exam guide, relative to the repo root; not in the repo — if it's missing, stop and tell the user to run `/exam-guide-update` to install it; extract text with `pdftotext "<path>" -`). To install a newer edition first, use the `exam-guide-update` skill.
- **Supplementary curriculum (third-party study site):** `https://claudecertificationguide.com/learn` — a community study site organized around the exact same 5 domains and task-statement numbering as the exam guide. Useful for cross-checking syllabus completeness, getting human-readable module titles, and mining exam traps / decision rules. **Not authoritative** — treat it like any third-party source (weak corroboration only; verify every fact against primary Anthropic docs). Key sub-pages:
  - `/learn/1-agentic-architecture` … `/learn/5-context-management` — per-domain module lists (task statements 1.1–1.7, 2.1–2.5, 3.1–3.6, 4.1–4.6, 5.1–5.6, each linking to a lesson page).
  - `/learn/quick-reference` — dense per-domain cheat sheets whose "decision rules" and "exam traps" tables are the highest-value slice for the **Anti-patterns** sections.
  - `/learn/glossary` — terminology, useful for cross-checking the per-domain concept glossaries.
- **Output directory:** `reference/study/` in this repo (create it if missing). Refreshing the docs is a maintainer task: write into the repo checkout, add a dated `CHANGES-<date>.md`, and commit so colleagues get the update with `git pull`. After a refresh, `scripts/build-pdf.sh` rebuilds the optional PDF.
- **Outputs:** one Markdown file per domain (`domain-1-agentic-architecture.md`, `domain-2-tool-design-mcp.md`, etc.) plus `INDEX.md` linking them. The `exam-mock` skill grounds on these docs.

## Guiding principle — concepts, not a crib

Build material that teaches the *domains and reasoning* the exam rewards, grounded in primary documentation. The PDF's **"Sample Questions"** section carries labeled correct answers, but those exist only to illustrate format and difficulty. **Never copy a sample question or its answer into the study docs.** You may read that section once to calibrate the *style and difficulty* of self-check questions you write, but every self-check question you produce must be original and concept-derived — not lifted from the samples.

## Phase 1 — Extract the syllabus (deterministic)

1. Extract the PDF text with `pdftotext`.
2. Parse the syllabus skeleton. The exam has **5 content domains**; confirm each against the PDF and capture its weighting and every task statement under it:

   | Domain | Title | Weight | Task statements |
   |--------|-------|-------:|-----------------|
   | 1 | Agentic Architecture & Orchestration | 27% | 1.1–1.7 |
   | 2 | Tool Design & MCP Integration | 18% | 2.1–2.5 |
   | 3 | Claude Code Configuration & Workflows | 20% | 3.1–3.6 |
   | 4 | Prompt Engineering & Structured Output | 20% | 4.1–4.6 |
   | 5 | Context Management & Reliability | 15% | 5.1–5.6 |

   Use this table as a completeness checklist, but read the actual task-statement titles and their **"Knowledge of"** / **"Skills in"** bullets from the PDF — those bullets are the precise research targets. If the PDF's structure differs from this table, trust the PDF and note the discrepancy.

   As a secondary cross-check, the supplementary site's per-domain pages (`/learn/N-...`) list the same task statements with friendlier module titles (e.g. 1.1 "Agentic Loops", 1.3 "Subagent Invocation and Context Passing"). Use these to confirm you've captured every task statement and to phrase research questions, **but the PDF is the source of truth** — if the site and PDF disagree on scope or numbering, trust the PDF and note it.
3. Also pull the **Appendix "Technologies and Concepts"** list and map each concept to the domain it belongs to.
4. Build a per-domain research target list: every task statement's knowledge/skills bullets plus its appendix concepts, rephrased as concrete research questions (e.g. "What does `stop_reason` return and how does an agentic loop use `tool_use` vs `end_turn`?", "What are the `tool_choice` options and when is `any` vs forced selection appropriate?").

This phase is reliable — the PDF extracts cleanly. Do not hallucinate task statements; only research what the PDF actually lists.

## Phase 2 — Deep research pass, one domain at a time

For each domain, run a genuine deep research pass over its research target list. Per domain:

1. **Fan out searches**, prioritizing authoritative primary sources:
   - `docs.anthropic.com` — Claude API reference, prompt engineering, tool use, MCP, Message Batches, Files API.
   - Claude Code docs (CLAUDE.md hierarchy, slash commands, skills, rules, plan mode, `--resume`, hooks).
   - Claude Agent SDK reference (agent definitions, agentic loop, subagents/`Task`, `allowedTools`, hooks like `PostToolUse`).
   - **Supplementary study site** (`claudecertificationguide.com/learn`) — use the matching domain page and its `/learn/quick-reference` cheat sheet to surface candidate topics, decision rules, and exam traps you might otherwise miss. Treat it as weak corroboration like any blog/forum/tutorial: it can point you at what to research, but never let a claim rest on it alone — confirm against primary docs before asserting.
2. **Fetch and read** the top sources — don't synthesize from snippets alone.
3. **Adversarially verify specifics.** Model IDs, context-window/token limits, parameter names, config file names and syntax, defaults, and pricing/limits are the exam's favorite distractor traps — confirm each against primary docs before asserting it. If two sources disagree or docs are silent, say so rather than guessing.
4. **Cite every nontrivial claim** with the source URL.
5. **Note knowledge boundaries.** If the docs are thin on a task statement, write what's known, flag the gap explicitly, and don't pad. Note that docs may have changed since your knowledge cutoff and the citation date matters.

If the user opted into multi-agent orchestration (invoked with "ultracode" or explicitly asked for a workflow), fan the 5 domains out in parallel via a `Workflow` (one research+verify pipeline per domain, plus per-task-statement sub-fan-out). A ready-built script lives alongside this skill at `build-workflow.js` — it encodes the full verified syllabus and the research→verify→write pipeline. Run it with `Workflow({ scriptPath: "<repo>/.claude/skills/exam-study-builder/build-workflow.js", args: { date: "<today>", outDir: "<repo>/reference/study" } })`, where `<repo>` is the absolute path of this repository. Re-confirm its `DOMAINS` task-statement titles still match the PDF (Phase 1) before running, and edit the script in place if the syllabus has changed. Otherwise research domains sequentially; you may still spawn `Explore`/research subagents per domain to parallelize within your turn. This is token-heavy — running it is the user's opt-in to that cost.

## Per-domain study document template

Write each domain's doc in this shape:

```markdown
# Domain N: <Title> (<weight>% of scored content)

> Generated <date> from the Claude Certified Architect – Foundations exam guide.
> Study material — grounded in cited primary docs, not an answer key.

## Scope & exam weight
<2–3 sentences: what this domain covers and which exam scenarios it maps to.>

## Task statements

### Task N.M: <verbatim task-statement title>
**What you need to know:** <synthesized, doc-grounded explanation of the knowledge/skills bullets.>
**Key facts:**
- <specific, verified fact> [source](url)
- ...
**Anti-patterns the exam tests:** <the wrong-but-tempting approaches the exam contrasts against — these map directly to distractors.>
**Self-check (original, concept-based):**
- <question the learner should be able to answer> → <brief answer>

<...repeat for every task statement in the domain...>

## Concept glossary (this domain's appendix slice)
- **<term>** — <one-line definition> [source](url)

## Sources
- <deduplicated list of every cited URL>
```

Keep "Anti-patterns" sharp — the exam is scenario-based and tests judgment, so the difference between the right pattern and the plausible-wrong one is the highest-value content (e.g. deterministic hook enforcement vs. prompt-based compliance; richer tool descriptions vs. consolidating tools; scoped tool access vs. giving one agent everything). Mine the supplementary site's `/learn/quick-reference` "decision rules" and "exam traps" tables for candidate anti-patterns, but state each only after the underlying right/wrong distinction checks out against primary docs.

## Finish — write the index

After all domain docs are written, create `INDEX.md` in the output directory:
- A one-line description of what the material is and when it was generated.
- A link to each domain doc with its weight and a one-line summary.
- A short "how to study" note (highest-weight domains first: Domain 1 at 27%, then the 20% domains).
- A reminder that facts were current as of the generation date and that learners should reconfirm version-specific specifics against live docs.

## Quality bar

- **Completeness:** every domain and every task statement in the PDF is covered. Cross-check against the Phase 1 table before finishing.
- **Grounded:** specific claims carry citations; unverifiable claims are flagged, not asserted.
- **Honest:** thin areas are marked as thin. No invented limits, IDs, or parameter names.
- **Original self-checks:** no sample question or its answer is reproduced.

## Do not

- Do not turn the sample questions into a memorization sheet.
- Do not state version-specific specifics (model IDs, limits, syntax) without a primary-doc citation.
