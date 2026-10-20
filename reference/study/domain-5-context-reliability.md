# Domain 5: Context Management & Reliability (15% of scored content)

> Generated 2026-06-14; refreshed 2026-10-16 against live docs.
> Study material — grounded in cited primary docs, not an answer key.

## Scope & exam weight

This domain (15% of scored content) covers keeping long-running and multi-agent systems reliable: preserving critical facts across long contexts, escalation and ambiguity resolution, error propagation, large-codebase context management, human review plus confidence calibration, and provenance in multi-source synthesis.

The recurring theme is that aggregate convenience (a single summary, a single accuracy number, a bigger context window, a generic error string) tends to hide the exact failure the exam wants you to design against.

Expect questions that contrast a plausible-but-lossy shortcut with a durable, evidence-preserving pattern.

## Task statements

### Task 5.1: Manage conversation context to preserve critical information across long interactions

**What you need to know**

Long interactions degrade predictably, and the exam tests whether you can preserve critical facts despite that degradation. The core documented phenomenon is "lost-in-the-middle": models reliably use information at the beginning and end of their context but recall middle content far less reliably, producing a U-shaped accuracy curve (Liu et al. 2023).

Anthropic's own long-context guidance reflects this by telling you to place longform data at the TOP of the prompt (above the query/instructions) and to put the query at the end — queries at the end can improve response quality by up to 30% on complex multi-document inputs. A related decay is "context rot": as token count grows, recall accuracy drops because the model has a finite "attention budget," so context should be treated as a finite resource of high-signal tokens.

Two failure modes this task targets are (1) progressive summarization that condenses precise values (numbers, percentages, dates, customer-stated expectations) into vague prose, and (2) verbose tool results that dump 40+ fields when only ~5 are relevant.

Mitigations: extract a persistent, verbatim "case facts" block that lives OUTSIDE the summarized history so exact figures survive compaction; trim tool outputs to only relevant fields; place key findings at the beginning with section headers; prefer passing complete history or summary continuity for coherence. Anthropic ships concrete tools: context editing (`clear_tool_uses_20250919`, plus `clear_thinking_20251015` for old thinking blocks) clears stale content while keeping the conversation, and server-side compaction summarizes older history — either automatically at a token threshold (`compact_20260112`) or, new since mid-2026, on demand when your application asks (`compaction: {"type": "summarize"}`, beta `compact-2026-09-04`). Compaction is lossy (and drops images, documents and fetched URLs from the summarized range), so anything that must survive verbatim belongs in a separate persistent store such as the client-side memory tool (`memory_20250818`).

The exam also tests CROSS-AGENT budget mitigations that fix the problem at the SOURCE rather than only on receipt: (a) require subagents to embed metadata (dates, source locations, methodological context) in their structured outputs so a downstream agent can synthesize accurately; and (b) when a downstream agent's context budget is tight, modify the UPSTREAM agent to emit structured data (key facts, citations, relevance scores) instead of verbose content/reasoning chains. The key discrimination: changing what the producer emits beats only trimming the producer's verbose output on the consuming side.

**Key facts**

- The "lost-in-the-middle" phenomenon is documented in the peer-reviewed paper "Lost in the Middle: How Language Models Use Long Contexts" (Nelson F. Liu et al., 2023): models use information at the very beginning or end of input best, and performance degrades significantly when relevant info is in the middle, producing a U-shaped curve. (Third-party academic source, not Anthropic primary doc.) [source](https://arxiv.org/abs/2307.03172)
- Anthropic long-context prompting guidance: "Put longform data at the top: Place your long documents and inputs near the top of your prompt, above your query, instructions, and examples. This improves performance across all models." (Long-context guidance now lives inside the consolidated Prompting best practices page; the old long-context-tips URL redirects there.) [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Verbatim (current wording): "Queries at the end can improve response quality by up to 30 percent in tests, especially with complex, multidocument inputs." [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- For long-document tasks, ask Claude to quote relevant parts first (e.g., into `<quotes>` tags) before carrying out the task, to cut through document noise. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Wrap multiple documents in an outer `<documents>` wrapper, each in `<document index="n">` with `<document_content>` and `<source>` subtags so Claude can parse them unambiguously. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Context must be treated as a finite resource with diminishing marginal returns; "context rot" is defined as: as the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases (an "attention budget" depleted per token). [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Compaction summarizes a conversation nearing the context limit and reinitiates with the summary; "overly aggressive compaction can result in the loss of subtle but critical context" — the art is choosing what to keep vs discard. [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Anthropic recommends structured note-taking / persistent external memory to track progress and maintain critical context and dependencies that would otherwise be lost across dozens of tool calls. [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- "One of the safest lightest touch forms of compaction is tool result clearing" — once a tool was called deep in history, the agent rarely needs the raw result again. [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- The context-editing strategy `clear_tool_uses_20250919` clears the oldest tool results first (defaults: trigger at 100,000 input tokens, keep 3 recent tool uses, `clear_tool_inputs` = false), replaces them with placeholder text, and is applied server-side while the client keeps full unmodified history. Optional params: `clear_at_least` (minimum tokens cleared per activation — clearing invalidates the prompt-cache prefix, so clear enough to make it worthwhile) and `exclude_tools` (tool names whose uses/results are never cleared). Context editing is still beta, header `context-management-2025-06-27`. The sibling `clear_thinking_20251015` strategy clears old thinking blocks (its `keep` default is model-specific) and must be listed FIRST in `edits` when combined. [source](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- When context editing is combined with the memory tool (`memory_20250818`), Claude receives an automatic warning as context approaches the clearing threshold so it can save important information to memory first. [source](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- Threshold compaction: the `compact_20260112` edit in `context_management.edits` (beta header `compact-2026-01-12`) summarizes older context when input tokens reach the trigger; the response starts with a content block of type `compaction` whose `content` field holds the summary, and on later requests the API ignores all content blocks before that block. `trigger` default `{"type": "input_tokens", "value": 150000}`, minimum 50,000 (`input_tokens` is the only trigger type); `pause_after_compaction` (default false) returns only the compaction block with `stop_reason: "compaction"` so you can adjust messages (e.g. re-insert recent turns verbatim) before continuing; `instructions` completely replaces the default summarization prompt. (Correction 2026-10-16: the default prompts DO ask Claude to wrap its summary in `<summary></summary>` tags; what you receive back is the `compaction` block's `content`.) Top-level `usage` excludes the compaction pass — sum `usage.iterations` for true cost. Supported on Claude 4.6-and-later models plus Mythos Preview; still beta. [source](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold)
- NEW (since June 2026) — on-demand compaction: send the conversation with the top-level `compaction: {"type": "summarize"}` parameter (beta header `compact-2026-09-04`) and the API returns ONLY a signed `compaction` block (`stop_reason: "compaction"`, no reply). You then put that block FIRST in `messages` in place of the messages it summarizes, send it unchanged (with its `signature`) on every later request, and send exactly one block per request; leftover summarized messages in front of it return 400 `compaction_block_misplaced`. Optional `instructions` (up to 16,384 characters) replaces the default prompt. It cannot be combined with `context_management` on the same request. Anthropic's overview recommends on-demand compaction wherever available; it also supports keeping recent turns verbatim and running in the background. [source](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand) / [overview](https://platform.claude.com/docs/en/build-with-claude/compaction)
- Compaction cannot carry everything: images, documents, `container_upload` blocks and fetched URLs inside the summarized messages are gone once the block replaces them — restate or re-upload anything a later turn still needs. Likewise `role: "system"` messages in the summarized range stop applying, so restate instructions that still matter. [source](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)
- Anthropic phrasing: "find the smallest possible set of high-signal tokens that maximize the likelihood of some desired outcome." [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Context awareness (CHANGED): currently documented for Claude Sonnet 5, Sonnet 4.6, Sonnet 4.5 (deprecated) and Haiku 4.5 — the API injects `<budget:token_budget>` in the system prompt and a `<system_warning>Token usage: X/Y; Z remaining</system_warning>` after each tool call, so the model tracks its remaining "token budget". Opus 4.7 and later Opus models, Sonnet 5.5, Haiku 5.5, and the Fable/Mythos models do NOT receive these tags; for them you can set an explicit budget with task budgets (beta). "The memory tool pairs well with context awareness for managing context transitions." [source](https://platform.claude.com/docs/en/build-with-claude/context-windows) / [prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Context window sizes: Fable 5.1/5, Mythos 5.1/5, Opus 5.5/5/4.8/4.7/4.6, Sonnet 5.5/5/4.6, Haiku 5.5 and Mythos Preview have a 1M-token window, and 1M is the default — no beta header needed, standard pricing (except Haiku 5.5, where prompts over 100,000 tokens cost more); up to 128k output tokens per request. Other models, including Sonnet 4.5 (deprecated) and Haiku 4.5, have 200k. The same page states "more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as context rot." [source](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- The memory tool (`memory_20250818`) is client-side: Claude requests file operations (`view`, `create`, `str_replace`, `insert`, `delete`, `rename`) under `/memories` and your application executes them against storage you control; no beta header is required and it is available on all Claude 4 and later models. Docs recommend pairing it with compaction: "compaction keeps the active context small ... and memory preserves the information that must survive summarization." Your handler must block path traversal outside `/memories`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
- Multi-window guidance: when a context window is cleared, consider starting a brand-new window rather than compacting — latest models are "extremely effective at discovering state from the local filesystem" (e.g. have it review progress.txt, tests.json and git logs). [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- When a downstream agent's context budget is tight, fix it at the source: require subagents to include metadata (dates, source locations, methodological context) in their structured outputs to support accurate downstream synthesis, and modify the upstream agent to return structured data (key facts, citations, relevance scores) rather than verbose content/reasoning chains — fixing the producer is preferable to only trimming the producer's verbose output on the consuming side. [guide-specific]

**Anti-patterns the exam tests**

✅ **Right:** keep a verbatim case-facts block outside the summary.

- ❌ Relying on progressive summarization alone to carry precise facts — condensing "$48,500 budget, 12% churn, March 3 deadline, customer wants SOC2 by Q3" into "discussed budget and timeline" loses the exact values decisions hinge on.
- ❌ Burying the most important facts in the MIDDLE of a long context (lost-in-the-middle) instead of at the beginning/end.
- ❌ Passing full raw tool outputs (40+ fields) into history because "more context is better" — wastes the attention budget; trim to the ~5 relevant fields.
- ❌ Assuming a bigger/longer context window eliminates recall problems — context rot means accuracy still degrades as tokens grow, so a 200K or 1M window does not make middle content reliable.
- ❌ Truncating or dropping the oldest messages naively to save tokens (loses coherence) instead of structured compaction/tool-result clearing plus a persistent facts store.
- ❌ Treating compaction as lossless and putting critical exact numbers only in the summary — compaction is explicitly lossy (and images, documents and fetched URLs in the summarized range do not survive at all).
- ❌ With on-demand compaction, leaving the summarized messages in front of the returned `compaction` block, editing its signed content, or dropping the block on later requests — the block must go first, unchanged, on every subsequent request.
- ❌ Aggressively clearing/compacting too early or too much, discarding subtle but critical context.
- ❌ Putting the query/instructions at the TOP with the long document after it — the reverse of the recommended order.
- ❌ Only trimming a verbose upstream output on the receiving side when the upstream agent could emit structured key-facts/citations in the first place — fix the producer when the consumer's budget is tight.

**Self-check (original, concept-based)**

- **Q:** A support agent has a 60-message thread where the customer stated an exact budget, a churn percentage, and a hard deadline early on; compaction is about to trigger — how do you ensure those exact figures survive?
  **A:** Extract them into a persistent, verbatim "case facts" block stored outside the summarized history (memory file or re-injected note), because compaction is lossy and progressive summarization blurs numbers/percentages/dates into vague prose.
- **Q:** Why place key findings at the very start (with section headers) and the query at the very end?
  **A:** Because of lost-in-the-middle: models reliably use the beginning and end of context but recall the middle poorly (U-shaped curve, Liu et al. 2023); docs recommend longform data at top and query at end (up to ~30% quality improvement on complex multi-document inputs).
- **Q:** A tool returns 40+ fields but only ~5 matter, across many calls — which two complementary moves reduce token waste without breaking coherence?
  **A:** (1) Trim tool outputs to only relevant fields before they enter history; (2) use tool-result clearing/context editing (`clear_tool_uses_20250919`) to drop stale raw results while keeping recent ones and the conversation intact.
- **Q:** Does a very large context window solve unreliable middle-of-context recall?
  **A:** No. Context rot means recall accuracy degrades as token count grows regardless of nominal window size, so critical facts still need edge positioning and/or a persistent facts store.
- **Q:** A research subagent feeds a downstream synthesizer whose context budget is nearly exhausted by the subagent's verbose reasoning chains — better fix: trim the verbose output on the synthesizer's side, or change what the subagent emits?
  **A:** Change what the subagent emits: have the upstream agent return structured data (key facts, citations, relevance scores) plus metadata (dates, source locations) instead of verbose content/reasoning. Trimming on receipt still forces the producer to ship the bloat; fixing the producer is the durable mitigation when the consumer's budget is tight.
- **Q:** Your application must control exactly when a long conversation is summarized (e.g., between user turns, never mid-tool-loop) and must keep recent turns word for word — threshold compaction or on-demand compaction?
  **A:** On-demand compaction: your code sends a separate request with the `compaction` parameter when it chooses and swaps the returned block in first; it supports keeping recent turns verbatim and running in the background. Threshold compaction fires inside an ordinary request whenever input tokens cross the trigger.

### Task 5.2: Design effective escalation and ambiguity resolution patterns

**What you need to know**

A well-designed support/agent system escalates to a human for three principled reasons: the customer explicitly asks for a human, the request hits a policy gap or exception that documented policy cannot answer (distinct from a policy violation, which has a documented answer), or the agent cannot make meaningful progress (tool errors, missing access, technical blockers).

When a customer explicitly asks for a person, the request is honored immediately rather than the agent trying to resolve the issue first; only when an issue is clearly straightforward should the agent offer to resolve it before handing off.

Anthropic's customer-support guide treats escalation accuracy as a first-class success metric (target ~95%) and recommends building escalation behavior into the prompt with explicit do/don't guardrails and 4-5 few-shot examples before adding heavier infrastructure (sentiment analyzers, classifier routers).

Two tempting signals are unreliable proxies for whether a case needs a human: customer sentiment/frustration does not correlate with case complexity, and a model's self-reported confidence is poorly calibrated (LLMs are typically overconfident) — note this confidence-calibration point rests on third-party research, not Anthropic product docs. For ambiguous identity (multiple records match), request additional disambiguating identifiers rather than heuristically picking a record. Anthropic's Building Effective Agents guidance frames human-in-the-loop checkpoints and explicit stopping conditions as foundational guardrails.

> Note: The structured "3 escalation triggers + 2 unreliable proxies" taxonomy is a study-guide synthesis/mnemonic. Anthropic primary docs support the components individually (escalation metric, guardrails, human-in-the-loop, sentiment as a separate quality metric) but do NOT enumerate this exact list verbatim.

**Key facts**

- The customer-support guide lists "Escalation efficiency" as a success criterion: "Claude's ability to recognize when a query needs human intervention and escalate appropriately... Aim for an escalation accuracy of 95% or higher." (The criterion is NAMED "Escalation efficiency" but the numeric target is phrased on "escalation accuracy.") [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- The guide recommends adding "at least 4-5 sample 'good' interactions" as few-shot examples, plus explicit Do's/Don'ts guardrails, to shape behavior in the prompt. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- The guide frames support chat as distinct tasks to break down, prompt, and evaluate individually; escalation is one such task to define explicitly. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- Guardrail guidance includes avoiding contractual commitments and not making promises/agreements the agent isn't authorized to make — a policy-gap situation warranting human handling. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- Before scaling architecture, first optimize prompts and add tools/prompt chains; add a separate intent classifier (extra Claude call, added latency) only if tasks are highly varied — prefer prompt-level escalation criteria before infrastructure. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- "Sentiment maintenance" is a separate business-impact metric ("maintained or improved sentiment in 90% of interactions"), distinct from the task-performance Escalation efficiency metric — sentiment is a quality signal, not an escalation trigger. (Related guide targets: deflection rate 70-80%, query comprehension accuracy 95%+, response relevance 90%+.) [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- The guide now recommends Claude Opus 5.5 for support chat ("well suited to balance intelligence, latency, and cost") and Claude Haiku 5.5 for latency-sensitive flows with multiple prompts (RAG, tool use, long context), with `effort` as the main speed control (`low` fastest). (Changed from Opus 4.8 / Haiku 4.5 in June; re-verified 2026-10-16 — model recommendations drift, so the exam is unlikely to hinge on the exact model.) [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- Building Effective Agents: "Agents can then pause for human feedback at checkpoints or when encountering blockers," and the agent can return to the human for further information or judgment. [source](https://www.anthropic.com/engineering/building-effective-agents)
- Building Effective Agents: "it's also common to include stopping conditions (such as a maximum number of iterations) to maintain control" — a reliability safeguard alongside escalation. [source](https://www.anthropic.com/engineering/building-effective-agents)
- Agents begin work from a command or interactive discussion with the human to establish clarity before operating independently, reinforcing clarification over assumption for ambiguous tasks. [source](https://www.anthropic.com/engineering/building-effective-agents)
- Independent calibration research finds LLMs tend to be overconfident — stated confidence often exceeds actual accuracy — supporting the principle that self-reported confidence is an unreliable escalation proxy. (Third-party research only, NOT an Anthropic-docs statement.) [source](https://arxiv.org/html/2510.26995v1)

**Anti-patterns the exam tests**

✅ **Right:** escalate on principled triggers, treat sentiment as a separate quality metric.

- ❌ Using sentiment/frustration detection as the escalation trigger — frustration does not correlate with case complexity (a furious customer may have a trivial fix; a calm one a hard policy question).
- ❌ Treating the model's self-reported confidence score as a reliability gate for escalation (LLM confidence is poorly calibrated and typically overconfident).
- ❌ Trying to resolve the issue first when a customer has explicitly asked for a human, instead of honoring the request immediately.
- ❌ Heuristically selecting one record when multiple customers match ("most recent"/"most active") instead of asking for additional identifiers — a privacy/data-exposure risk.
- ❌ Escalating every complex-sounding case rather than distinguishing policy gaps/exceptions (need human judgment) from policy violations (have documented answers the agent can give).
- ❌ Reaching for sentiment-analyzer or classifier infrastructure before encoding explicit escalation criteria and few-shot examples in the prompt.
- ❌ Letting the agent make unauthorized promises/commitments instead of escalating policy-exception requests.

**Self-check (original, concept-based)**

- **Q:** A calm, polite customer asks for a one-time exception to a refund policy the documented policy doesn't cover, and the agent's self-reported confidence is high — escalate?
  **A:** Yes. This is a policy gap/exception requiring human judgment; calm sentiment and high self-reported confidence are both unreliable proxies and should not override the policy-gap trigger.
- **Q:** Mid-conversation a customer types "just connect me to a real person" — correct first action?
  **A:** Honor the explicit human request immediately and hand off; do not attempt to resolve first. (Offering to resolve first is only appropriate when the customer hasn't asked for a human and the issue is clearly straightforward.)
- **Q:** A lookup returns three records matching the name provided — what to do, what to avoid?
  **A:** Ask for an additional disambiguating identifier (email, phone, order number); avoid heuristically picking one record (most recent/active), which risks exposing the wrong person's data.
- **Q:** What does Anthropic guidance suggest before building a sentiment-analysis or classifier service for escalation?
  **A:** First encode explicit escalation criteria with do/don't guardrails and 4-5 few-shot examples in the prompt and optimize prompts/tools; add a separate classifier only if needed for highly varied tasks (it adds an extra Claude call and latency).

### Task 5.3: Implement error propagation strategies across multi-agent systems

**What you need to know**

In an orchestrator-worker system, a single failed step can cascade: "one step failing can cause agents to explore entirely different trajectories." The defensive design is two-layered.

1. A subagent should attempt local recovery for transient failures — Claude's intelligence handles this well when you let it know a tool is failing and let it adapt, reinforced by deterministic safeguards like retry logic and regular checkpoints.
2. When a failure is unresolvable, the subagent must propagate a STRUCTURED error report to the coordinator — failure type, the action attempted, any partial results, and alternative approaches — rather than a generic "search unavailable" string, so the coordinator can re-route or re-delegate instead of guessing.

At the API level, client tools signal failure with a `tool_result` block carrying `is_error: true` and an instructive message, which also lets a subagent distinguish an ACCESS FAILURE (a timeout/500 that may warrant retry) from a VALID EMPTY RESULT (a successful search that found nothing — not an error).

The two anti-patterns the exam contrasts are (1) silently suppressing errors / treating empty-as-success, and (2) terminating the whole workflow on a single subagent failure instead of degrading gracefully with partial results.

> Note: The terms "structured error context" and "coverage annotations" are exam-guide paraphrases, not verbatim Anthropic feature names. The docs ground the underlying principles (instructive errors, `is_error`, end-state evaluation, partial-results propagation, graceful failure) but do not use that exact vocabulary.

**Key facts**

- Client tools signal failure by returning a `tool_result` content block with the optional boolean `is_error: true`; the error message goes in the block's `content` and Claude incorporates it into its response. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- Docs recommend instructive error messages: instead of generic errors like "failed," include what went wrong and what to try next, e.g. "Rate limit exceeded. Retry after 60 seconds." [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- An empty `tool_result` (a `tool_use_id` with no `content`) is syntactically valid and, absent `is_error`, is treated as a non-error result. (Example re-verified 2026-10-16; the docs show an "empty tool result" example but do NOT explicitly label it "the documented representation of a successful no-data result" — that semantic framing is the exam's.) [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- Server tools (e.g. web_search) handle their own errors transparently — you do NOT set `is_error` for them; web search surfaces error codes `too_many_requests`, `invalid_input`, `max_uses_exceeded`, `query_too_long`, and `unavailable`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- "If a tool request is invalid or missing parameters, Claude will retry 2-3 times with corrections before apologizing to the user." [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- `strict: true` on a tool definition guarantees Claude's tool inputs match the JSON Schema (grammar-constrained sampling) and the tool name is always valid — eliminating invalid/missing-parameter calls as a class (within the supported JSON Schema subset). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- In the multi-agent research system, errors compound: "One step failing can cause agents to explore entirely different trajectories, leading to unpredictable outcomes." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- "We combine the adaptability of AI agents built on Claude with deterministic safeguards like retry logic and regular checkpoints." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- On failure, resume rather than restart: "we built systems that can resume from where the agent was when the errors occurred." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- End-state evaluation over process evaluation: "Instead of judging whether the agent followed a specific process, evaluate whether it achieved the correct final state." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- In the Agent SDK, each subagent runs in its own conversation, which starts fresh unless it is a fork; intermediate tool calls/results stay inside the subagent and only its final message returns to the parent as the Agent tool result (the parent may then summarize it). So any error context the coordinator needs must be in that final message. (Since Claude Code v2.1.210 the final message is also scanned for instruction-shaped patterns — e.g. imitated control tags — which are neutralized, never removed.) [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- The only channel from parent to subagent is the Agent tool's prompt string; subagents do not receive the parent's conversation history or tool results, so error messages/decisions must be passed explicitly in that prompt. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- The subagent tool appears as "Agent" in `tool_use` blocks but as "Task" in the `system:init` tools list; before Claude Code v2.1.63 `tool_use` blocks also named it "Task" — match both for cross-version compatibility. (The earlier note that `result.permission_denials[].tool_name` also uses "Task" no longer appears on the page — reconfirm — not re-verified 2026-10-16.)
- NEW — API errors in subagents: an API error that ends a subagent early (e.g. a rate limit) is never delivered as its result. In the foreground, if the subagent already produced text, the Agent tool returns the partial output with a note that the task wasn't finished; if it produced nothing (or only tool calls) it fails with "Agent terminated early due to an API error" plus the detail. In the background, the subagent is marked failed and the completion message names the error and includes its last output "so partial work isn't lost." A subagent stopped by `maxTurns` returns output marked as partial and can be resumed. This is the platform's own version of "propagate partial results with the failure type, don't silently succeed." [source](https://code.claude.com/docs/en/sub-agents) / [SDK](https://code.claude.com/docs/en/agent-sdk/subagents) [source](https://code.claude.com/docs/en/agent-sdk/subagents)

**Anti-patterns the exam tests**

✅ **Right:** return structured error context (failure type, attempted query, partial results) so the coordinator can decide retry vs re-route; recover locally from transient failures and degrade gracefully with a gap annotation rather than failing the whole workflow.

- ❌ Silently suppressing errors / treating empty-as-success: catching a timeout or 500 and returning an empty result (or no `is_error` flag) so the coordinator reads it as "searched, found nothing" — hides context and corrupts downstream synthesis.
- ❌ Returning a generic "search unavailable" string with no failure type, attempted query, or partial results — the coordinator cannot make a retry vs re-route decision.
- ❌ Terminating the entire workflow when one subagent fails, instead of degrading gracefully and continuing with partial results plus a gap annotation.
- ❌ Conflating an access failure (retryable transient error) with a valid empty result (successful query, zero matches) — opposite handling.
- ❌ Propagating raw failures up immediately without attempting local recovery for transient issues (skipping the subagent's retry/adapt layer).
- ❌ Setting `is_error` on server-tool results (Claude already handles those) or, conversely, omitting `is_error` so a real failure looks like normal data.
- ❌ Restarting a failed long-running agent from scratch instead of resuming from a checkpoint.

**Self-check (original, concept-based)**

- **Q:** A subagent's web search times out with HTTP 500 — why is returning an empty result list wrong, and what should it return?
  **A:** An empty list reads as "searched successfully, no matches," so the coordinator won't retry or re-route and treats the gap as fact. Return a structured error (failure type, attempted query, partial results, alternative approach), or after local retries fail, propagate `is_error` with an instructive message so the coordinator can decide.
- **Q:** How should a subagent decide between handling a failure itself vs propagating it?
  **A:** Attempt local recovery for transient/retryable failures (retry, adapt to the failing tool); propagate only unresolvable failures, and when propagating include partial results and a gap annotation rather than terminating the workflow.
- **Q:** In the Agent SDK, why must a subagent embed full error context in its final message?
  **A:** Only the final message returns to the parent as the Agent tool result; intermediate tool calls and errors stay inside the subagent's isolated context, so if the failure details aren't in that final message the coordinator never sees them.
- **Q:** Why evaluate an agent on end-state rather than exact process, and how does that relate to error propagation?
  **A:** Agents are non-deterministic and may reach the goal via alternative paths after recovering; judging the process would penalize valid recoveries. Error propagation supports this by letting the coordinator re-route around failures while still reaching the correct final state.

### Task 5.4: Manage context effectively in large codebase exploration

**What you need to know**

A model's context window holds the entire session: conversation history, file reads, command outputs, CLAUDE.md, auto memory, loaded skills, and system instructions. As an exploration session grows, context fills and degrades; Claude Code compacts automatically, but detailed instructions and exact code snippets read early can be summarized away — which is why an extended session may give inconsistent answers or fall back on "typical patterns" instead of the specific classes it discovered.

Three durable techniques counter this:

1. Subagent delegation: each subagent runs in its own fresh, isolated context window, does verbose work, and returns only a summary, so the coordinator's window stays clean.
2. Persistence to disk: put durable rules in CLAUDE.md (re-injected from disk after compaction), use auto memory / agent persistent-memory directories (MEMORY.md), and write findings to scratchpad/manifest files so state survives context boundaries, crashes, and restarts.
3. Manual context control: `/compact` summarizes (optionally with focus instructions) and `/clear` starts fresh between unrelated tasks.

Auto-compaction clears older tool outputs first, then summarizes; it preserves your requests and key code snippets but drops verbose tool outputs and early detailed instructions.

What survives depends on the loading mechanism: project-root CLAUDE.md, unscoped rules, and auto memory are re-injected from disk, while path-scoped rules and nested CLAUDE.md are lost until a matching file is read again.

**Key facts**

- `/compact [instructions]` frees up context by summarizing the conversation so far; you can optionally pass focus instructions (e.g. `/compact focus on the auth bug fix`) to control what the summary keeps. [source](https://code.claude.com/docs/en/commands)
- `/clear` starts a new conversation with empty context; the previous conversation stays available in `/resume`. To free context while continuing the same conversation, use `/compact`. Aliases: `/reset`, `/new`. [source](https://code.claude.com/docs/en/commands)
- Claude Code compacts automatically as context approaches the limit: it clears older tool outputs first, then summarizes the conversation if needed. Your requests and key code snippets are preserved; detailed instructions from early in the conversation may be lost. [source](https://code.claude.com/docs/en/how-claude-code-works)
- Each subagent runs in its own isolated context window with a custom system prompt; it does not see the main conversation history, and only its final text summary returns to the main conversation, keeping verbose reads out of the main window. (Exception: a fork inherits the parent conversation.) [source](https://code.claude.com/docs/en/sub-agents)
- The built-in Explore subagent is a fast, read-only agent (Write and Edit denied) for file discovery, code search and codebase exploration that keeps results out of the main context. CHANGED: it now runs on the main conversation's model (not Haiku); define your own `Explore` subagent with `model: haiku` to run exploration cheaper. Claude picks a thoroughness level (quick / medium / very thorough). Explore and Plan start WITHOUT your CLAUDE.md files and the git status snapshot, and are one-shot (no agentId, cannot be resumed). [source](https://code.claude.com/docs/en/sub-agents)
- Subagent persistent memory: setting `memory: user|project|local` gives a directory (e.g. `~/.claude/agent-memory/<name>/`) where the subagent accumulates insights across conversations; its system prompt includes the first 200 lines or 25KB of MEMORY.md, whichever comes first. [source](https://code.claude.com/docs/en/sub-agents)
- What survives compaction: project-root CLAUDE.md, unscoped rules, auto memory and the plan written in plan mode are re-injected from disk; rules with `paths:` frontmatter and nested CLAUDE.md are summarized away and reload on demand when a matching file is touched again (move a rule to project-root CLAUDE.md or drop `paths:` if it must persist); Claude Code re-reads up to five of the most recently modified files Claude read or edited (files over 5,000 tokens come back as a path reference only); invoked skill bodies are re-injected capped at 5,000 tokens per skill and 25,000 tokens total (oldest dropped first; the skill listing itself does not reload); background commands/subagents keep running; SessionStart hooks matching the `compact` source run and add their output. [source](https://code.claude.com/docs/en/context-window)
- A compaction summary keeps your requests/intent, key technical concepts, files examined/modified with important code snippets, errors and fixes, pending tasks, and current work; it replaces the verbatim conversation, so full tool outputs and intermediate reasoning are gone. [source](https://code.claude.com/docs/en/context-window)
- Sessions are saved as plaintext JSONL files under `~/.claude/projects/`, enabling rewinding, resuming (`--continue` / `--resume`), and forking (`--fork-session` / `/branch`); each new session starts with a fresh context window. [source](https://code.claude.com/docs/en/how-claude-code-works)
- Subagent transcripts persist independently at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` and are unaffected by main-conversation compaction; cleanup follows `cleanupPeriodDays` (default 30 days). [source](https://code.claude.com/docs/en/sub-agents)
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` sets the percentage (1-100) of the auto-compact window at which auto-compaction triggers; it can only lower the threshold (values above the default are ignored) and applies to main conversations and subagents. [source](https://code.claude.com/docs/en/env-vars)
- Default auto-compact thresholds (CHANGED): without an auto-compact window set, Claude Code compacts at the model's context limit, except: models running a native 1M window (Fable models, Sonnet 5+, Haiku 5.5, Opus 4.7+) compact before it fills, at about 967K tokens; Sonnet 4.6 / Opus 4.6 without extended context compact at the 200K boundary; cloud sessions compact as they approach the limit. [source](https://code.claude.com/docs/en/model-config)
- NEW controls: `/autocompact <size>` (e.g. `/autocompact 500k`, `auto` to reset; 100K–1M) sets how full the window gets before auto-compaction; also the `autoCompactWindow` setting, `--autocompact` flag, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` env var (takes precedence), and a per-subagent `autoCompactWindow`. `DISABLE_AUTO_COMPACT=1` turns off automatic (and idle) compaction but keeps manual `/compact`; `DISABLE_COMPACT=1` disables both. `/rewind` can "Summarize from here" / "Summarize up to here" to compact part of a conversation. [source](https://code.claude.com/docs/en/context-window) / [commands](https://code.claude.com/docs/en/commands) / [env](https://code.claude.com/docs/en/env-vars)
- If a single file or tool output is so large that context refills immediately after each summary, Claude Code stops auto-compacting after a few attempts and shows a thrashing error rather than looping. [source](https://code.claude.com/docs/en/how-claude-code-works)
- Run `/context` for a live breakdown of context usage by category with optimization suggestions, including which CLAUDE.md and auto memory files loaded (and a warning if the conversation exceeds the window); run `/memory` to open and edit those files and toggle auto memory. [source](https://code.claude.com/docs/en/context-window)
- Put persistent rules in CLAUDE.md rather than relying on conversation history (re-injected from disk after compaction); you can add a Compact Instructions section to CLAUDE.md to control what compaction preserves. [source](https://code.claude.com/docs/en/how-claude-code-works)
- 1M context in Claude Code (CHANGED): Fable 5.1, Fable 5, Sonnet 5 and later, Haiku 5.5 and Opus 4.7 and later run with the 1M window by default (no `[1m]` suffix); Opus 4.6 and Sonnet 4.6 reach 1M only via their `[1m]` variant (plan-dependent). `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` holds sessions to 200K. Compaction works the same way at the larger limit. [source](https://code.claude.com/docs/en/model-config) / [context window](https://code.claude.com/docs/en/context-window)

**Anti-patterns the exam tests**

✅ **Right:** persist durable findings to a scratchpad/manifest (or CLAUDE.md) and delegate verbose exploration to a subagent or the read-only Explore agent; continue the same task with focused `/compact` rather than reading everything into the main context or `/clear`-ing mid-exploration.

- ❌ Treating `/compact` and `/clear` as equivalent: `/clear` discards the conversation and starts empty (good between unrelated tasks), while `/compact` summarizes and keeps key info to continue the SAME task — using `/clear` mid-exploration throws away discovered findings.
- ❌ Relying on conversation history to retain specific class names/code discovered early — after compaction those exact snippets and early instructions can be lost; durable facts belong in CLAUDE.md (re-injected) or a scratchpad/manifest file.
- ❌ Assuming everything is re-injected after compaction: path-scoped rules (`paths:` frontmatter) and nested CLAUDE.md are NOT re-injected and only reload when a matching file is read again; skill bodies are capped/dropped.
- ❌ Reading dozens of files directly into the main context instead of delegating to a subagent (or the read-only Explore agent), flooding the main window with content you won't reference again.
- ❌ Believing a subagent inherits the main conversation — a normal subagent starts fresh and isolated; only a fork (`/subtask`, formerly `/fork`) inherits prior history.
- ❌ Assuming the built-in Explore agent sees your CLAUDE.md conventions — Explore and Plan start without CLAUDE.md and git status, so put anything they must know into the delegation prompt.
- ❌ Assuming subagent results are free — many subagents each returning detailed results can still consume significant main-context tokens.
- ❌ Thinking auto-compaction makes manual context management unnecessary — proactively using `/compact` with focus, `/clear`, scratchpads, and subagents avoids the automatic pass guessing wrong.
- ❌ Confusing compaction with crash recovery — compaction reduces context but does not by itself persist state; durable recovery relies on disk artifacts (manifests, MEMORY.md, JSONL transcripts).

**Self-check (original, concept-based)**

- **Q:** During a long exploration Claude starts answering with generic "typical patterns" rather than the specific class it found earlier — what happened and how to prevent it?
  **A:** Compaction summarized away the verbatim early content, so the exact snippet/class is gone. Persist key findings to CLAUDE.md or a scratchpad/manifest on disk, delegate verbose reads to subagents, or run `/compact` with focus instructions before the window fills.
- **Q:** Why does delegating exploration to a subagent keep the coordinating agent reliable over a long session?
  **A:** The subagent runs in its own fresh, isolated context window; its many file reads and verbose output stay there and only a compact summary returns, so the main window doesn't bloat and degrade.
- **Q:** After a `/compact`, which loaded instructions survive automatically and which do not?
  **A:** Project-root CLAUDE.md, unscoped rules, auto memory and the plan-mode plan are re-injected from disk; path-scoped rules (`paths:` frontmatter) and nested subdirectory CLAUDE.md are lost until a matching file is touched again; up to five recently modified files are re-read; invoked skill bodies are re-injected but capped (5K/skill, 25K total).
- **Q:** Your task needs to survive a crash and resume cleanly — what persists vs what is ephemeral?
  **A:** Disk artifacts persist: CLAUDE.md, MEMORY.md / agent-memory directories, scratchpad/manifest files, and JSONL session/subagent transcripts under `~/.claude/projects/`. The in-window conversation is ephemeral and gets summarized, so a coordinator should reload its manifest from a known location on resume.

### Task 5.5: Design human review workflows and confidence calibration

**What you need to know**

When you automate extraction or classification with Claude, you decide which outputs to trust automatically and which to route to humans. The core insight this task tests is that a single aggregate accuracy number (e.g. "97% overall") can hide catastrophic per-segment failures: a high-volume document type dominates the average while a rare or high-stakes type (handwritten receipts, a specific field like "amount") performs far worse.

Anthropic's eval guidance reinforces this — design evals that mirror the real task distribution, deliberately include edge cases, and measure against a held-out, labeled (ground-truth) test set rather than a single blended score.

To route review attention you need *calibrated* confidence: Claude does not natively emit a calibrated per-field probability of correctness, so you build that mapping yourself by comparing model signals against a labeled validation set, then set thresholds per document type and per field. Validate accuracy broken down by document type and field segment first; only automate proven high-confidence segments, and keep checking them with stratified random sampling (including the automated band) so novel error patterns surface.

For grounding and auditability, Anthropic provides the Citations feature and hallucination-reduction techniques (allow "I don't know," extract direct quotes, require citations, best-of-N verification, restrict to provided documents); route low-confidence, ambiguous, or contradictory outputs to human review.

**Key facts**

- Eval guidance: design evals to mirror your real-world task distribution and explicitly factor in edge cases — listed examples include irrelevant/nonexistent input, overly long input, harmful input, and "ambiguous test cases where even humans would find it hard to reach an assessment consensus." [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Success criteria should be Specific, Measurable, Achievable, Relevant, measured on a held-out test set (example: F1 of at least 0.85 on 10,000 diverse held-out Twitter posts); "Edge case analysis: Percentage of edge cases handled without errors" is a listed quantitative method, supporting per-segment rather than only aggregate measurement. [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Grading methods ranked: code-based (fastest, most reliable, scalable, lacks nuance); human ("Most flexible and high quality, but slow and expensive. Avoid if possible."); LLM-based (fast, flexible, scalable; test reliability before scaling, use detailed rubrics, output empirical labels). [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Eval principle: "Prioritize volume over quality" — more questions with slightly lower-signal automated grading beats fewer hand-graded ones; you can use Claude to generate additional test cases from a baseline set. [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Hallucination-reduction techniques to gate/route extractions: allow Claude to say "I don't know"; for >20k-token documents extract word-for-word quotes before answering; verify with citations (retract any claim lacking a supporting quote); chain-of-thought verification; best-of-N verification (inconsistency across runs signals hallucination); external knowledge restriction; iterative refinement. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- These techniques "significantly reduce hallucinations" but "don't eliminate them entirely. Always validate critical information, especially for high-stakes decisions" — the documented basis for keeping humans in the loop on high-stakes outputs. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- Citations feature (native API): set `citations.enabled=true` per document; responses interleave text with citations returning `cited_text` plus location (`char_location` 0-indexed exclusive, `page_location` 1-indexed exclusive, `content_block_location`), giving reviewers verifiable pointers; `cited_text` does not count toward output tokens. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- Citations are supported on all active models (CHANGED: the old Haiku 3 exception is gone from the Citations page; Haiku 3 is no longer among active models) and are evaluated as more likely to cite the most relevant quotes than prompt-based approaches; they are incompatible with Structured Outputs (combining citations with `output_config.format` returns a 400 error). [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- **Citations vs strict tool use / forced `tool_choice` (resolved 2026-10-16):** the ONLY documented hard incompatibility is with JSON outputs (`output_config.format`, or the deprecated `output_format`) → 400. Neither the Citations page, the Strict tool use page, nor the structured-outputs "Feature compatibility" list names `strict: true` or `tool_choice` as incompatible with citations — the 400 trigger is specifically `output_config.format`. So citations + strict tools in one request is not a documented error (not empirically tested — reconfirm with a live call). [source](https://platform.claude.com/docs/en/build-with-claude/citations) [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#feature-compatibility) [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- Claude does not natively emit a calibrated per-field confidence score / probability of correctness via the Messages API; calibration is an external practice built on labeled validation sets (LLM-as-judge graders calibrated to human experts, metrics like F1 on held-out sets). The model can be prompted to self-report confidence as text, but that is an unverified self-assessment, not a calibrated API field. (Absence claim; no such field seen on the Citations, develop-tests or models pages re-checked 2026-10-16 — a future logprobs-style feature would change it.) [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- Agent-eval guidance: "LLM-as-judge graders should be closely calibrated with human experts to gain confidence that there is little divergence"; read transcripts to tell whether a low score is a genuine model failure or a grader/harness flaw — aggregate scores alone can mislead. [source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- pass@k ("the likelihood that an agent gets at least one correct solution in k attempts") vs pass^k ("the probability that all k trials succeed") illustrate why averages hide consistency problems; measure both to avoid a single optimistic aggregate. [source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

**Anti-patterns the exam tests**

✅ **Right:** break accuracy down by document type AND field segment, calibrate per-field confidence against a labeled validation set, and stratified-sample across all bands (including the high-confidence/automated band) to route review attention to the highest-uncertainty segments first.

- ❌ Trusting a single aggregate accuracy figure (e.g., 97% overall) to justify full automation — it hides per-document-type and per-field failure rates; break accuracy down by document type AND field segment first.
- ❌ Treating Claude's raw expressed confidence (or a model-emitted 0.90) as if it were calibrated probability of correctness — Claude does not natively emit calibrated per-field confidence; calibrate against a labeled validation set before thresholding.
- ❌ Sampling only the low-confidence/already-flagged items for QA — that band is already going to humans; also stratified-sample the high-confidence/automated band or novel error patterns go undetected.
- ❌ Distributing reviewer capacity evenly or chronologically (FIFO) instead of prioritizing the highest-uncertainty, ambiguous, or historically weak segments first.
- ❌ Relying on prompt-only "cite your sources" instead of the structured Citations feature when verifiable, location-anchored quotes are needed (though note Citations cannot combine with Structured Outputs).
- ❌ Skipping human review on high-stakes outputs because hallucination mitigations were applied — docs explicitly say they reduce but don't eliminate hallucinations.

**Self-check (original, concept-based)**

- **Q:** Your pipeline reports 97% overall field accuracy and you want to automate — why is that number insufficient, and what do you measure instead?
  **A:** Aggregate accuracy is weighted by high-volume, easy segments and can mask poor accuracy on rare or high-stakes document types and specific fields. Break accuracy down by document type AND field segment against a labeled held-out set, and only automate individually validated segments.
- **Q:** You already route every low-confidence extraction to a human — why still stratified-sample the high-confidence automated band?
  **A:** Low-confidence items are already reviewed, so sampling only them surfaces nothing new; novel or drifting error patterns appear inside the automated high-confidence outputs that no human otherwise sees.
- **Q:** A model returns 0.90 "confidence" on both a date field and an amount field — same automation threshold for both?
  **A:** No. Raw confidence is not calibrated and the same nominal score can map to different true accuracy per field; calibrate against a labeled validation set per field/type and set thresholds accordingly.
- **Q:** What native Claude API capability gives a reviewer a verifiable pointer back to source text for each claim, and one constraint?
  **A:** The Citations feature (`citations.enabled` on documents returns `cited_text` plus location indices); a constraint is incompatibility with Structured Outputs (returns 400); citations must also be enabled on all or none of the documents in a request.

### Task 5.6: Preserve information provenance and handle uncertainty in multi-source synthesis

**What you need to know**

When synthesizing across multiple sources, the core failure mode is losing the claim-to-source mapping during summarization, which makes outputs unauditable.

Anthropic's primary mitigations keep each claim tied to its supporting evidence: structure inputs so every document carries metadata (XML `<document>` blocks with `<source>` and `<document_content>` subtags, or the Citations feature's title/context fields), ask Claude to extract verbatim quotes before answering long-document tasks, and prefer the Citations / Search Results features so each emitted claim ships with a citation pointing to an exact location (char/page/block index) in a specific source.

The Citations feature guarantees that returned citations are valid pointers into the provided documents and that `cited_text` matches the source — stronger than prompt-only "please cite."

For uncertainty, the documented technique is to explicitly permit "I don't know," restrict Claude to provided documents (external-knowledge restriction), and retract any claim it cannot back with a quote.

When rendering the synthesis, match each content type to an appropriate format rather than normalizing everything to one uniform shape: financial/quantitative data as tables, news/narrative as prose, and technical findings as structured lists.

> Note: The docs are explicit on provenance and uncertainty but are largely silent on the exam's specific rules for annotating conflicting statistics, requiring publication/collection dates to disambiguate temporal differences, and rendering by content type (financial->tables, news->prose, technical->lists). Treat those as derived best practices following from the general grounding/attribution and formatting-control guidance, not as named primary-doc primitives (status uncertain as of 2026-06-14 — verified absence on the four most relevant pages, not exhaustively).

**Key facts**

- The Citations feature is enabled per-document by setting `citations.enabled=true` on each document content block; currently citations must be enabled on all or none of the documents in a request. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- Citations are guaranteed valid pointers into the provided documents because the model outputs them in a standardized format parsed into `cited_text` plus document location indices. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- Citation location types are document-type-specific: `char_location` (plain text, 0-indexed char range, exclusive end), `page_location` (PDF, 1-indexed page range, exclusive end), `content_block_location` (custom content, 0-indexed block range, exclusive end), and `search_result_location` (search results, `search_result_index` + start/end block index). [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- `cited_text` contains the exact source text and does NOT count toward output tokens; when passed back in subsequent turns it is also not counted toward input tokens. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- A document's `title` and `context` fields are passed to the model but are NOT citable content; only text in the document's `source` can be cited. `context` is useful for storing document metadata as text or stringified JSON since `title` is length-limited. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- All active models support citations (re-verified 2026-10-16; the Haiku 3 exception now applies only to search results); `document_index` is 0-indexed across all document content blocks spanning all messages in the request. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- Citations and Structured Outputs are incompatible: enabling citations on a user-provided document while also setting `output_config.format` (or the deprecated `output_format`) returns a 400 error, because citations interleave citation blocks with text. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- Citations are NOT documented as incompatible with strict tool use (`strict: true`) or with forced `tool_choice` — only with `output_config.format`. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#feature-compatibility) But two practical limits apply: (1) citations ride on `text` blocks, and with `tool_choice` `any`/`tool` the API prefills so Claude emits no natural-language text before `tool_use` — a forced turn therefore carries no citations; the cited answer comes in the next turn after the `tool_result`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use) The official search-results example does exactly this: forced `tool_choice` on the retrieval turn, `search_result` blocks with `citations.enabled` inside the `tool_result`, then a follow-up request without `tool_choice` that returns cited text. [source](https://platform.claude.com/docs/en/build-with-claude/search-results) (2) On Claude Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1, forced `tool_choice` `any`/`tool` returns a 400 regardless of citations (use `auto` + `strict: true`). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use)
- Search result content blocks (type `search_result`) require `source`, `title`, and `content` (array of text blocks), with optional `citations.enabled` (disabled by default; all search results in a request must use the same setting) and `cache_control`; they bring web-search-quality source attribution to custom RAG apps and can be returned from tool calls or supplied as top-level content. No beta header is required. Supported on all active models except Claude Haiku 3 (replaces the June per-model list). [source](https://platform.claude.com/docs/en/build-with-claude/search-results)
- For long-context (20k+ tokens), put longform documents at the TOP of the prompt above the query/instructions; "Queries at the end can improve response quality by up to 30% in tests, especially with complex, multi-document inputs." [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Structure multiple documents with XML: wrap them in `<documents>`, each in `<document index="n">` containing `<source>` and `<document_content>` subtags so source attribution survives synthesis. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Ground responses in quotes: for long-document tasks ask Claude to extract relevant verbatim quotes (e.g., into `<quotes>` tags) before performing the task, which reduces hallucinations by cutting through document noise. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- To reduce hallucinations: explicitly allow "I don't know," restrict to provided documents (external knowledge restriction), and after drafting have Claude find a supporting quote for each claim and retract any claim it cannot support. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- Custom content documents perform no additional chunking, giving the most control over citation granularity (e.g., per-bullet, transcript, or per-RAG-chunk); plain text and PDF are auto-chunked into sentences. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- In multi-source synthesis output, render each content type in the format that fits it — financial/quantitative data as tables, news/narrative as prose, technical findings as structured lists — rather than converting everything to one uniform format. (Derived best practice following from formatting-control guidance; not a named primary-doc primitive — see status note above.) [guide-specific]

**Anti-patterns the exam tests**

✅ **Right:** annotate the conflict and attribute each figure to its source (and ideally its date).

- ❌ When credible sources report conflicting statistics, arbitrarily picking one number and presenting it as fact.
- ❌ Stripping source identifiers during summarization so the final summary has no claim-to-source mapping and cannot be audited.
- ❌ Relying on the model's general/parametric knowledge instead of restricting it to the provided documents.
- ❌ Treating temporally different data points (different publication or collection dates) as a contradiction rather than dating each figure.
- ❌ Asking the model to "cite sources" purely via prompt text and trusting them, instead of using Citations/Search Results which guarantee valid pointers and extract verified `cited_text`.
- ❌ Trying to combine citations with Structured Outputs in one request (returns a 400).
- ✅ When you need BOTH location-anchored citations and machine-readable fields: get the cited answer as text (citations on), then extract into JSON in a separate call (or a strict tool), carrying provenance as explicit fields (quote, source, date) — rather than adding `output_config.format` to the citations request.
- ❌ Assuming citations are incompatible with all tool use — the documented 400 is only for `output_config.format`; citations work with tool-returned `search_result` blocks.
- ❌ Putting the question first and the long documents last (degrades quality vs documents-at-top).
- ❌ Rendering all synthesized content as the same shape regardless of type instead of matching content to format (tables for financials, lists for technical, prose for narrative).
- ❌ Forcing all source content into one large text block, which makes every citation return the entire block instead of a focused span.

**Self-check (original, concept-based)**

- **Q:** Two reputable reports give different market-size figures — what is the documented-principle response, and why is choosing the larger one wrong?
  **A:** Preserve and attribute both: annotate the conflict, naming each source (and ideally its publication/collection date) rather than silently selecting one. Arbitrarily picking one destroys provenance and may misrepresent a temporal difference as a single "truth," making the output unauditable.
- **Q:** Why is the Citations feature more reliable for provenance than prompting "quote your sources"?
  **A:** Citations are parsed into a standardized format and `cited_text` is extracted, so they are guaranteed valid pointers into the provided documents; prompt-only quoting can hallucinate or misquote, and the feature also avoids charging output tokens for `cited_text`.
- **Q:** A request enables `citations` on documents and also defines a tool with `strict: true` (no `output_config.format`). Does the API reject it, and what if you also force that tool with `tool_choice`?
  **A:** No documented rejection — the citations 400 is tied to `output_config.format`, not to strict tools (treat as reconfirm-by-test). Forcing the tool means the turn is a bare `tool_use` with no text, so no citations appear in that turn; and on Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Mythos 5.1 forced `tool_choice` itself 400s.
- **Q:** You need per-bullet citation granularity from a transcript instead of sentence-level chunks — which document type and why?
  **A:** Use a custom content document (`source.type` `content` with a `content` array), because it does no additional chunking — each provided content block is the citable unit. Plain text and PDF are auto-chunked into sentences.
- **Q:** How should provided documents be positioned and tagged in a long multi-source synthesis prompt?
  **A:** Place documents at the top of the prompt above the query, and wrap each in `<document index="n">` with `<source>` and `<document_content>` subtags so metadata and attribution survive synthesis; queries at the end can improve quality by up to ~30%.
- **Q:** A synthesis combines quarterly revenue figures, a press-release narrative, and an engineering benchmark writeup — how should the output render each, versus the tempting one-format shortcut?
  **A:** Match content to format: the revenue figures as a table, the narrative as prose, and the technical benchmark as a structured list — rather than normalizing everything to one uniform format (e.g., forcing all three into prose or all into a single table), which obscures the data's natural shape. (The docs are not explicit here, so treat this as a derived best practice, but it is the content-appropriate choice the exam rewards.)

## Concept glossary (this domain's appendix slice)

- **Lost-in-the-middle** - Documented phenomenon where LLMs use information at the beginning and end of context reliably but recall middle content poorly (U-shaped accuracy curve). [source](https://arxiv.org/abs/2307.03172)
- **Context rot** - Degradation of recall accuracy as the number of tokens in the context window increases; each token depletes a finite "attention budget." [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **Compaction** - Summarizing a conversation nearing the context limit and continuing with the summary; lossy by design. API forms: threshold (`compact_20260112` edit, beta `compact-2026-01-12`) and on-demand (`compaction: {type: "summarize"}`, beta `compact-2026-09-04`). [source](https://platform.claude.com/docs/en/build-with-claude/compaction)
- **Context editing / tool-result clearing** - Server-side clearing of stale tool results (and optionally tool inputs) while the client keeps full history; `clear_tool_uses_20250919` strategy. [source](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- **Structured note-taking / persistent memory** - Writing critical facts and progress to storage outside the context window so they survive summarization and dozens of tool calls. [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **Case facts block** - A verbatim, persistent record of precise values (numbers, percentages, dates, customer-stated expectations) kept outside summarized history (exam-framed pattern; grounded in persistent-memory guidance). [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **High-signal tokens** - The smallest set of tokens that maximizes the likelihood of the desired outcome; the goal of context curation. [source](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- **Context awareness** - API-injected token-budget tags that let Sonnet 5, Sonnet 4.6, Sonnet 4.5 (deprecated) and Haiku 4.5 track remaining context; newer Opus/Haiku 5.5/Sonnet 5.5/Fable models don't get them (use task budgets, beta). [source](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- **On-demand compaction** - Application-triggered compaction: a request with the `compaction` parameter returns a signed `compaction` block that replaces the summarized messages and must be sent first on every later request. [source](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)
- **Memory tool** - Client-side tool (`memory_20250818`) letting Claude create/read/update/delete files under `/memories` that persist across conversations; pairs with compaction and context editing. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
- **Escalation trigger** - A defined condition that hands a case to a human: explicit human request, policy gap/exception, or inability to make meaningful progress. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- **Escalation efficiency** - Success metric for how accurately the agent recognizes and routes cases needing human intervention (target ~95% escalation accuracy). [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- **Policy gap vs. policy violation** - A gap/exception is silent in documented policy and needs human judgment; a violation has a documented answer the agent can give directly. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- **Few-shot escalation examples** - Sample good interactions (4-5+) embedded in the prompt that demonstrate when and how to escalate or ask for clarification. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- **Confidence calibration** - Degree to which a model's stated confidence matches its actual accuracy; LLMs are typically overconfident, making self-reported confidence an unreliable escalation proxy (third-party research). [source](https://arxiv.org/html/2510.26995v1)
- **Human-in-the-loop checkpoint** - A designed pause where the agent returns to a human for feedback, information, or judgment, especially at blockers. [source](https://www.anthropic.com/engineering/building-effective-agents)
- **Stopping condition** - An explicit limit (e.g., max iterations) that halts agent execution to maintain control and prevent compounding errors. [source](https://www.anthropic.com/engineering/building-effective-agents)
- **Disambiguating identifier** - Additional unique data (email, phone, order number) requested when multiple records match, instead of heuristically guessing the customer. [source](https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat)
- **is_error** - Optional boolean field on a `tool_result` content block; set true when client-tool execution failed, with the message in `content` so Claude can adapt. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **tool_result** - User-message content block returning a tool's output (or error) to Claude, keyed to a tool_use by `tool_use_id`; an empty one (no content) is a valid non-error result. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **Orchestrator-worker (coordinator/subagent) pattern** - A lead agent decomposes a task and delegates subtasks to subagents determined at runtime, then synthesizes their results. [source](https://www.anthropic.com/engineering/building-effective-agents)
- **Access failure vs valid empty result** - A retryable transient error (timeout/500) versus a successful query that legitimately returned zero matches — handled oppositely. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **Durable execution / resume** - Designing agents to resume from where an error occurred rather than restarting from scratch, via checkpoints and retry logic. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **End-state evaluation** - Judging whether an agent reached the correct final outcome rather than whether it followed a fixed process, allowing valid alternative recovery paths. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Context isolation (subagents)** - Each subagent runs in a fresh conversation; only its final message returns to the parent, so error context must be placed there. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- **Coverage annotation** - Exam-guide term for explicitly flagging which parts of a task a subagent did vs did not cover when propagating partial results; grounded in "identify gaps" guidance but not a verbatim docs term. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Context window** - The model's working memory holding conversation history, file reads, command outputs, CLAUDE.md, auto memory, loaded skills, and system instructions for a session. [source](https://code.claude.com/docs/en/context-window)
- **/compact** - Slash command that frees context by summarizing the conversation so far; accepts optional focus instructions to control what the summary preserves. [source](https://code.claude.com/docs/en/commands)
- **/clear** - Slash command that starts a new conversation with empty context (previous stays in `/resume`); aliases `/reset`, `/new`. Use `/compact` instead to keep continuing the same task. [source](https://code.claude.com/docs/en/commands)
- **Auto-compaction** - Automatic context management that clears older tool outputs first, then summarizes as the window approaches the limit; tunable with `/autocompact`, `autoCompactWindow`, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`. [source](https://code.claude.com/docs/en/how-claude-code-works)
- **Subagent** - A specialized assistant that runs in its own isolated context window with its own prompt and tools, returning only a summary so verbose exploration stays out of the main conversation. [source](https://code.claude.com/docs/en/sub-agents)
- **Explore subagent** - Built-in fast, read-only subagent (runs on the main conversation's model; starts without CLAUDE.md/git status) for codebase search and analysis that keeps exploration results out of the main context. [source](https://code.claude.com/docs/en/sub-agents)
- **Persistent memory (agent memory)** - A subagent's user/project/local directory (e.g. `~/.claude/agent-memory/<name>/` with MEMORY.md) where it accumulates knowledge across conversations. [source](https://code.claude.com/docs/en/sub-agents)
- **Auto memory (MEMORY.md)** - Learnings Claude saves automatically; the first 200 lines or 25KB load at session start and are re-injected from disk after compaction. [source](https://code.claude.com/docs/en/memory)
- **/context** - Slash command that visualizes current context usage by category with optimization suggestions and capacity warnings. [source](https://code.claude.com/docs/en/commands)
- **Fork (subagent / session)** - A spawn that inherits the entire current conversation instead of starting fresh; its own tool calls stay isolated but it sees prior history (unlike a normal subagent). [source](https://code.claude.com/docs/en/sub-agents)
- **Session JSONL transcript** - Plaintext JSONL file under `~/.claude/projects/` recording each message/tool use, enabling rewind, resume, and fork for crash recovery. [source](https://code.claude.com/docs/en/how-claude-code-works)
- **Aggregate accuracy trap** - Relying on one overall accuracy number that hides poor performance on specific document types or fields because high-volume easy cases dominate the average. [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- **Stratified random sampling (for QA)** - Sampling outputs from each document type and confidence band — including the high-confidence automated band — to measure true error rates and detect novel error patterns. [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- **Held-out / labeled validation set (ground truth)** - Human-labeled test data not used for prompt tuning, used to measure accuracy and calibrate confidence per segment. [source](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- **Citations feature** - Native Claude API feature that returns `cited_text` plus source location indices for each claim, enabling auditable, verifiable extraction for human review. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- **cited_text** - The exact source span supporting a claim; provided for convenience and not counted toward output (or replayed input) tokens. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- **char_location / page_location / content_block_location** - Citation types for plain-text (0-indexed char range), PDF (1-indexed page range), and custom-content (0-indexed block range) documents respectively. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- **search_result_location** - Citation type for `search_result` blocks, identifying the source via `search_result_index` plus start/end block index. [source](https://platform.claude.com/docs/en/build-with-claude/search-results)
- **title / context fields** - Optional per-document metadata passed to the model but never cited; `context` can hold doc metadata as text or stringified JSON. [source](https://platform.claude.com/docs/en/build-with-claude/citations)
- **search_result content block** - Content block (source, title, content[], optional `citations.enabled`) that brings web-search-quality source attribution to custom/RAG apps. [source](https://platform.claude.com/docs/en/build-with-claude/search-results)
- **Best-of-N verification** - Running the same prompt multiple times and comparing outputs; inconsistencies flag possible hallucinations and candidates for human review. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Allow "I don't know"** - Explicitly permitting Claude to admit uncertainty so ambiguous/insufficient-information cases are flagged rather than fabricated, supporting routing to humans. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **External knowledge restriction** - Instructing Claude to use only the provided documents, not its general knowledge, to keep synthesis grounded. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- **Quote-first grounding** - Technique of having Claude extract verbatim quotes before answering long-document tasks to reduce hallucination and anchor provenance. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **LLM-as-judge calibration** - Confirming an LLM grader closely agrees with human experts before trusting its scores at scale; pairs with transcript review to detect misleading aggregates. [source](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **strict tool use** - `strict: true` on a tool definition constrains token sampling to schema-valid outputs, guaranteeing tool inputs follow the schema and the tool name is always valid (within the supported JSON Schema subset). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)

## Sources

- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- https://platform.claude.com/docs/en/build-with-claude/context-windows
- https://platform.claude.com/docs/en/build-with-claude/compaction-threshold
- https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- https://code.claude.com/docs/en/model-config
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://arxiv.org/abs/2307.03172
- https://arxiv.org/html/2510.26995v1
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://platform.claude.com/docs/en/build-with-claude/context-editing
- https://platform.claude.com/docs/en/build-with-claude/compaction
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
- https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat
- https://www.anthropic.com/engineering/building-effective-agents
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://www.anthropic.com/engineering/multi-agent-research-system
- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/how-claude-code-works
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/context-window
- https://code.claude.com/docs/en/env-vars
- https://code.claude.com/docs/en/memory
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- https://platform.claude.com/docs/en/build-with-claude/citations
- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://platform.claude.com/docs/en/build-with-claude/search-results
