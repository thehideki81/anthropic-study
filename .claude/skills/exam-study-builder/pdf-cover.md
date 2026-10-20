# Claude Certified Architect – Foundations — Study Material

> Generated 2026-06-14 and refreshed 2026-10-16 from the official exam guide, grounded in cited primary Anthropic documentation (platform.claude.com, code.claude.com, Claude Agent SDK reference, anthropic.com/engineering, modelcontextprotocol.io). Study material, **not** an answer key — no exam sample question or its answer is reproduced.

This guide contains five self-contained, cited sections — one per exam content domain. Each covers every task statement with: what you need to know, key facts (with primary-source citations), the anti-patterns the exam contrasts against (these map to distractors), an original concept-based self-check, and a per-domain concept glossary.

## Contents (by exam weight)

| # | Domain | Weight | Tasks |
|---|--------|-------:|------:|
| 1 | Agentic Architecture & Orchestration | 27% | 7 |
| 4 | Prompt Engineering & Structured Output | 20% | 6 |
| 3 | Claude Code Configuration & Workflows | 20% | 6 |
| 2 | Tool Design & MCP Integration | 18% | 5 |
| 5 | Context Management & Reliability | 15% | 6 |

Sections appear in the order above.

- **Domain 1 — Agentic Architecture & Orchestration (27%):** Agentic loops (`stop_reason` control), coordinator/subagent multi-agent orchestration, Agent-tool spawning and context passing, deterministic hooks, task decomposition, and session resume/fork with the Claude Agent SDK.
- **Domain 4 — Prompt Engineering & Structured Output (20%):** Explicit criteria to cut false positives, few-shot prompting, structured output via `tool_use` + JSON schemas, validation/retry loops, the Message Batches API, and multi-instance/multi-pass review.
- **Domain 3 — Claude Code Configuration & Workflows (20%):** CLAUDE.md hierarchy and `@import`, `.claude/rules/` path scoping, custom slash commands and skills, plan mode vs direct execution, iterative refinement, and CI/CD headless integration.
- **Domain 2 — Tool Design & MCP Integration (18%):** Tool descriptions, structured errors (`isError`/retryable), tool distribution, `tool_choice`, MCP scoping (`.mcp.json` vs `~/.claude.json`), resources, and built-in tool selection.
- **Domain 5 — Context Management & Reliability (15%):** Preserving critical facts across long contexts, escalation/ambiguity resolution, error propagation, large-codebase context management, human review with confidence calibration, and provenance in multi-source synthesis.

## How to study

The exam is scenario-based and tests **judgment**, not recall — so the highest-value content in each section is the **"Anti-patterns the exam tests"** line under every task statement: it names the plausible-wrong option that distractors are built from.

1. **Start with Domain 1 (27%)** — the largest single block and the conceptual core (agentic loops, orchestration). Domains 3 and 4 (20% each) come next, then 2 (18%) and 5 (15%).
2. The six exam **scenarios** (Customer Support agent, Claude Code code-gen, Multi-Agent Research, Developer Productivity, CI/CD, document extraction) each span multiple domains — after a first pass per domain, re-read each domain's "Scope & exam weight" through the lens of those scenarios.
3. Use the per-task **self-checks** as active recall; use each domain's **concept glossary** as a final-review sweep.

## Caveats

- Facts were re-verified against live docs **as of 2026-10-16** and may have changed since. **Reconfirm version-specific specifics against live docs** — model IDs, token/context limits, parameter names, config file names and syntax, CLI flags, defaults, and pricing/limits are the exam's favorite distractor traps and the docs' fastest-moving details.
- A small number of facts are explicitly flagged in-section (e.g. "reconfirm — may have changed", "docs are silent") where primary documentation was thin or ambiguous at generation time. Treat those as prompts to verify, not as settled fact.
- A community study site was used only as a weak corroboration / topic-surfacing aid; every asserted fact here is cited to a **primary** Anthropic source.
