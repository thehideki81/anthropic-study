# Claude Certified Architect – Foundations — Study Material

> Generated 2026-06-14 from the official exam guide PDF (`instructor.pdf`); **refreshed 2026-10-16** by re-verifying every key fact against live primary docs (platform.claude.com, code.claude.com incl. the Agent SDK docs, anthropic.com/engineering, modelcontextprotocol.io). See [CHANGES-2026-10-16.md](CHANGES-2026-10-16.md) for what changed. Study material, **not** an answer key — no exam sample question or its answer is reproduced.

**Exam guide:** version 0.2, last updated 2026-06-30 (`reference/instructor.pdf`). Checked 2026-10-20 against version 0.1, which the docs were built from: the domains, weights, scenarios and all 30 task statements are unchanged, so the docs still cover the current syllabus. The guide isn't in the repo: install it, or a newer edition, with `/exam-guide-update`.

Five self-contained, cited study documents — one per exam content domain. Each covers every task statement (30 total, unchanged in the exam guide) with: what you need to know, key facts (with primary-source citations), the anti-patterns the exam contrasts against (these map to distractors), an original concept-based self-check, and a per-domain concept glossary.

## Domains (by exam weight)

| # | Domain | Weight | Tasks | Doc |
|---|--------|-------:|------:|-----|
| 1 | Agentic Architecture & Orchestration | 27% | 7 | [domain-1-agentic-architecture.md](domain-1-agentic-architecture.md) |
| 4 | Prompt Engineering & Structured Output | 20% | 6 | [domain-4-prompt-engineering.md](domain-4-prompt-engineering.md) |
| 3 | Claude Code Configuration & Workflows | 20% | 6 | [domain-3-claude-code-config.md](domain-3-claude-code-config.md) |
| 2 | Tool Design & MCP Integration | 18% | 5 | [domain-2-tool-design-mcp.md](domain-2-tool-design-mcp.md) |
| 5 | Context Management & Reliability | 15% | 6 | [domain-5-context-reliability.md](domain-5-context-reliability.md) |

- **Domain 1 — Agentic Architecture & Orchestration (27%):** Agentic loops (`stop_reason` control), coordinator/subagent multi-agent orchestration, Agent-tool spawning and context passing, deterministic hooks, task decomposition, and session resume/fork with the Claude Agent SDK.
- **Domain 4 — Prompt Engineering & Structured Output (20%):** Explicit criteria to cut false positives, few-shot prompting, structured output via `tool_use` + JSON schemas, validation/retry loops, the Message Batches API, and multi-instance/multi-pass review.
- **Domain 3 — Claude Code Configuration & Workflows (20%):** CLAUDE.md hierarchy and `@import`, `.claude/rules/` path scoping, custom slash commands and skills, plan mode vs direct execution, iterative refinement, and CI/CD headless integration.
- **Domain 2 — Tool Design & MCP Integration (18%):** Tool descriptions, structured errors (`isError`/retryable), tool distribution, `tool_choice`, MCP scoping (`.mcp.json` vs `~/.claude.json`), resources, and built-in tool selection.
- **Domain 5 — Context Management & Reliability (15%):** Preserving critical facts across long contexts, escalation/ambiguity resolution, error propagation, large-codebase context management, human review with confidence calibration, and provenance in multi-source synthesis.

## Exam format

From the exam guide (version 0.2):

| | |
|---|---|
| Questions | 60, multiple choice: one correct answer and three incorrect options |
| Time limit | 120 minutes (2 minutes per question) |
| Structure | 4 scenarios, drawn at random from the bank of 6 listed below |
| Answering | Every question must be answered before you can move on, so always pick something |
| Scoring | Scaled score from 100 to 1,000; 720 to pass. Results are reported as pass or fail. |
| Delivery | Online with a proctor, or at a test centre |
| Fee | $125 USD |
| Validity | 12 months from the date the credential is awarded |

The scaled score isn't a percentage, so 720 doesn't mean 72% correct.

## How to study

The exam is scenario-based and tests **judgment**, not recall — so the highest-value content in each doc is the **"Anti-patterns the exam tests"** line under every task statement: it names the plausible-wrong option that distractors are built from.

1. **Start with Domain 1 (27%)** — the largest single block and the conceptual core (agentic loops, orchestration). Domains 3 and 4 (20% each) come next, then 2 (18%) and 5 (15%).
2. The six exam **scenarios** (Customer Support agent, Claude Code code-gen, Multi-Agent Research, Developer Productivity, CI/CD, document extraction) each span multiple domains. Each sitting uses 4 of them, chosen at random, so prepare for all six — after a first pass per domain, re-read each domain's "Scope & exam weight" through the lens of those scenarios.
3. Use the per-task **self-checks** as active recall; use each domain's **concept glossary** as a final-review sweep.

## Caveats

- Facts were re-verified against live docs **as of 2026-10-16** (originally generated 2026-06-14) and may have changed since. **Reconfirm version-specific specifics against live docs** — model IDs, token/context limits, parameter names, config file names and syntax, CLI flags, defaults, and pricing/limits are the exam's favorite distractor traps and the docs' fastest-moving details.
- A small number of facts are explicitly flagged in-doc (e.g. "reconfirm — may have changed", "docs are silent") where primary documentation was thin or ambiguous at generation time. Treat those as prompts to verify, not as settled fact. Flag counts at generation (2026-06-14): D1=2, D2=4, D3=3, D4=1, D5=4. After the 2026-10-16 refresh, items that could not be re-verified carry `(reconfirm — not re-verified 2026-10-16)`: D1=3, D2=3, D3=6, D4=4 (+1 citations-test note), D5=1 (+citations-test note) — listed in the changelog.
- A community study site (`claudecertificationguide.com/learn`) was used only as a weak corroboration / topic-surfacing aid; every asserted fact here is cited to a **primary** Anthropic source, not to that site.
- **Fast-moving items changed in the Oct 2026 refresh (high distractor risk):** current models are `claude-opus-5-5` (docs' default starting point), `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-1` (Opus 4.8 is legacy); forced `tool_choice` (`any`/`tool`) now **400s on Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Mythos 5.1** (use `auto` + `strict: true` or `output_config.format`); the built-in Explore subagent now uses the main conversation's model (not Haiku); Claude Code interactive sessions start in auto mode and `default` is shown as "Manual"; MCP spec revision is now 2026-07-28 (input-validation failures → `isError: true` tool results); a new on-demand compaction API (`compaction` param, beta `compact-2026-09-04`) sits beside threshold compaction `compact_20260112`.
- **Citations compatibility (resolved 2026-10-16):** Citations are documented as incompatible **only** with JSON outputs (`output_config.format` / deprecated `output_format` → 400). Strict tool use (`strict: true`) and forced `tool_choice` are not documented as incompatible; but a forced turn emits only `tool_use` (no text, hence no citations), and forcing itself 400s on the newest models. Citations + `strict: true` was not tested live. See Domain 4 Task 4.3 and Domain 5 Tasks 5.5/5.6.
- An optional single-file PDF of these docs can be built with `scripts/build-pdf.sh` (it isn't committed). Earlier versions of these docs are in the git history.
