# Domain 1: Agentic Architecture & Orchestration (27% of scored content)

> Generated 2026-06-14; refreshed 2026-10-16 against live docs.
> Study material — grounded in cited primary docs, not an answer key.

## Scope & exam weight

This domain (27% of scored content) covers building agentic loops and multi-agent (coordinator/subagent) systems with the Claude Agent SDK.

Topics include: loop control via `stop_reason`, Task-tool (now `Agent`-tool) subagent spawning, context passing, hooks, task decomposition, and session resume/fork.

It maps to the Customer Support, Multi-Agent Research, and Developer Productivity scenarios.

The recurring theme the exam tests is structural/deterministic control (stop reasons, hooks, tool calls) versus probabilistic prompt steering.

> Refresh note (2026-10-16): the current docs default model ID in examples is `claude-opus-5-5`. Several product details moved since June (nested-subagent depth default, background-by-default subagents, fork commands, hook timeouts, cross-directory resume, forced `tool_choice` restrictions on the newest models). The exam is written against the syllabus concepts, so where the product now offers more (e.g. subagents that can message siblings), the syllabus principle is kept and the new behavior is noted alongside it.

## Task statements

### Task 1.1: Design and implement agentic loops for autonomous task execution

**What you need to know**

An agentic loop is a `while`-loop keyed on the response's `stop_reason`, not on parsed natural-language text or a fixed iteration count.

The canonical Messages-API cycle is:

1. Send a request containing your `tools` array plus the conversation.
2. Claude responds — if `stop_reason == "tool_use"` the response carries one or more `tool_use` content blocks (each with `id`, `name`, and an `input` JSON object).
3. Your application executes each tool client-side and formats the outputs as `tool_result` blocks (`type: "tool_result"`, `tool_use_id` matching the call, `content`, optional `is_error`).
4. Append the assistant's response and then a NEW user message containing the `tool_result` blocks to the message history.
5. Repeat while `stop_reason` is `"tool_use"`.

The loop exits naturally when Claude returns a different stop reason — most often `end_turn`, but also `max_tokens`, `stop_sequence`, `refusal`, `pause_turn` (server tools: resend to continue), or `model_context_window_exceeded`. The key design principle is model-driven decision-making: Claude decides on each turn whether to call a tool or finish (with default `tool_choice: {"type":"auto"}`), so termination is signaled structurally by `stop_reason`, not by scanning prose or hard-capping iterations as the primary stop.

The Agent SDK wraps this same loop ("gather context → take action → verify work → repeat"), terminating when Claude produces a response with no tool calls; its `max_turns`/`max_budget_usd` are safety caps, not the primary termination mechanism. The Anthropic client SDKs also ship a beta **Tool Runner** (`client.beta.messages.tool_runner(...)`) that runs this loop for you until Claude returns a message with no tool use. Pitfall: never add a text block immediately after a `tool_result` block — it trains Claude to expect user input after every tool use and can cause empty `end_turn` responses.

**Key facts**

- The agentic loop for client tools is a while-loop keyed on `stop_reason`: send request with tools, Claude returns `stop_reason 'tool_use'` with `tool_use` blocks, execute tools and format `tool_result` blocks, send a new request with the original messages plus the assistant response plus a user message of `tool_result` blocks, and repeat while `stop_reason` is `'tool_use'`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- The loop exits on any `stop_reason` other than `'tool_use'` — `'end_turn'`, `'max_tokens'`, `'stop_sequence'`, or `'refusal'`. A robust loop also handles `pause_turn` (server tools) by sending the response back to continue, rather than exiting. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- `stop_reason` values are: `end_turn` (finished naturally), `max_tokens` (hit `max_tokens` limit), `stop_sequence` (matched a custom stop sequence), `tool_use` (Claude is calling a tool), `pause_turn` (a server-tool loop reached its iteration limit), `refusal` (Claude declined), and `model_context_window_exceeded` (the response filled the model's context window — treat as truncated). [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- `refusal` comes back as a normal HTTP 200, not an error. The response's `stop_details` field identifies the policy category (`stop_details` is `null` for every other stop reason); the recommended action is to read `stop_details` and retry on a fallback model. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- A `tool_use` content block has the shape `{"type":"tool_use","id":"toolu_...","name":"get_weather","input":{...}}` — `id` (e.g. `toolu_01A09q90qw90lq917835lq9`), `name`, and an `input` JSON object conforming to the tool's `input_schema`. Computer-use and browser-use toolset members also carry a `toolset_name` field, and their `tool_result` must echo it. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- A `tool_result` block has `type='tool_result'`, `tool_use_id` (matching the originating `tool_use` id), optional `content` (string, nested `text`/`image`/`document`/`search_result` blocks), and optional `is_error` (true on failure). It must be sent in a `user`-role message, must immediately follow the corresponding `tool_use` message, and must come FIRST in the content array — text placed BEFORE a `tool_result` gives a 400 error. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- To continue the loop after a tool call, append the assistant message (`{'role':'assistant','content':response.content}`) then a user message (`{'role':'user','content':tool_results}`) and call the API again — `tool_result` blocks go in a USER message, not an assistant message. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- With the default `tool_choice {"type":"auto"}`, Claude decides on each turn whether to call a tool or respond directly. The four options are `auto` (default when tools are provided), `any` (must use some tool), `tool` (force a named tool), `none` (default when no tools are provided). This is model-driven decision-making, steerable by the system prompt. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- Client tools (user-defined plus Anthropic-schema tools `memory`/`bash`/`text_editor`/`computer`/`browser`) require your app to drive the loop; server tools (`web_search`, `web_fetch`, `code_execution`, `tool_search`) run their own loop on Anthropic infrastructure and you never construct `tool_result` blocks for them. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- NEW (since June): if Claude calls a server tool AND a client tool in the same parallel group, the response comes back with `stop_reason: "tool_use"` and a `server_tool_use` block that has no result yet. Reply with a user message containing ONLY the client `tool_result` blocks and keep the same `tools` array; the API then runs the server tool. Adding text after the results (or dropping the server tool from `tools`) gives a 400 for a server tool Claude called directly. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- Anti-pattern guidance from the docs: "if you're writing a regex to extract a decision from model output, that decision should have been a tool call." [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- Never add a text block immediately after a `tool_result` block; doing so teaches Claude to expect user input after every tool use and can produce empty responses (typically 2–3 tokens, no content) with `stop_reason 'end_turn'`. Send `tool_result` blocks alone; don't resend the empty response — as a last resort add a new user message such as "Please continue." [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- In the Agent SDK the loop is: receive prompt, evaluate and respond (AssistantMessage, may include tool calls), execute tools, repeat, and return result — "Claude continues calling tools and processing results until it produces a response with no tool calls," at which point the loop ends and a `ResultMessage` is yielded. [source](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- Anthropic frames the agent feedback loop as "gather context -> take action -> verify work -> repeat"; the same post announced renaming the Claude Code SDK to the Claude Agent SDK. [source](https://claude.com/blog/building-agents-with-the-claude-agent-sdk)
- The Agent SDK's `max_turns`/`maxTurns` counts tool-use turns only and `max_budget_usd`/`maxBudgetUsd` caps estimated spend (subagent spend included); both default to no limit. Hitting them yields a `ResultMessage` with subtype `error_max_turns` or `error_max_budget_usd` — they are safety caps, not the primary termination signal. Other result subtypes: `success`, `error_during_execution`, `error_max_structured_output_retries`; only `success` carries the `result` text. [source](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- The SDK `ResultMessage` also carries a `stop_reason` field (e.g. `end_turn`, `max_tokens`, `refusal`) from the final model turn; detect refusals with `stop_reason == "refusal"`. A single-shot `query()` raises after yielding an error result, so wrap it in try/except. [source](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- `pause_turn` is returned when the server-side sampling loop reaches its iteration limit (default 10 iterations per request) for server tools; continue by sending the response back as-is. Client `tool_use` blocks never produce `pause_turn`. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- `model_context_window_exceeded` is returned without a beta header on Claude Sonnet 4.5 (now deprecated) and newer models; earlier models need the beta header `model-context-window-exceeded-2025-08-26`. In the client SDKs the value is currently typed only in the `beta` namespace. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- If `stop_reason` is `max_tokens` and the last content block is an incomplete `tool_use`, retry with a higher `max_tokens` to get the full tool call. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- NEW: the beta Tool Runner (Python/TS/C#/Go/Java/PHP/Ruby SDKs, `client.beta.messages.tool_runner(...)`) "loops until Claude returns a message without a tool use, or until it reaches `max_iterations` if you set it"; use the manual loop when you need human-in-the-loop approval, custom logging, or conditional execution. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner)
- NEW: Claude Managed Agents (beta, header `managed-agents-2026-04-01`) is a pre-built agent harness running in managed infrastructure (Agent, Environment, Session, Events) for long-running/asynchronous work — the alternative to writing your own loop on the Messages API. [source](https://platform.claude.com/docs/en/managed-agents/overview)
- Docs examples now use the model ID `claude-opus-5-5` (was `claude-opus-4-8` in June 2026). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)

**Anti-patterns the exam tests**

✅ **Right:** terminate by checking `stop_reason` structurally (continue while `tool_use`, exit on `end_turn`).

- ❌ parsing assistant prose for "I'm finished"/"done"/"final answer" — the docs steer against exactly this ("if you're writing a regex to extract a decision... that decision should have been a tool call").
- ❌ using an arbitrary iteration cap (e.g. "stop after 5 turns") as the PRIMARY stop — `max_turns`/`max_budget_usd` (and Tool Runner's `max_iterations`) are safety backstops with no default limit, not the main termination logic.
- ❌ hardcoding an if/else decision tree of which tool to call when, instead of letting the model decide under `tool_choice auto`.
- ❌ putting `tool_result` blocks in an assistant-role message, or sending them without first appending the assistant `tool_use` message (breaks `tool_use_id` pairing).
- ❌ appending a text block right after a `tool_result` ("Here's the result") — conditions Claude to end its turn.
- ❌ building a client-side execution loop for server tools and constructing `tool_result` blocks for them — server tools run their own loop and signal continuation with `pause_turn`, not `tool_use`.
- ❌ treating `refusal` or `max_tokens` as loop-continue conditions identical to `tool_use` instead of distinct handled exits (and treating `refusal` as an HTTP error — it is a 200 with `stop_details`).

**Self-check (original, concept-based)**

- **Q:** Your agent loop checks `if 'all done' in response.text` to decide whether to stop. Why is this fragile, and what should it key on instead?
  **A:** Natural-language phrases are unreliable and model-dependent; the API gives a structured signal. Key the loop on `stop_reason`: continue while it equals `'tool_use'` and exit on `'end_turn'` (handling `max_tokens`/`refusal`/`pause_turn` separately).
- **Q:** After Claude returns a `tool_use` block with id `'toolu_99'`, where exactly do you place the result and how do you link it back?
  **A:** Append the assistant message (`response.content` with the `tool_use` block), then append a user-role message whose content is a `tool_result` block: `{type:'tool_result', tool_use_id:'toolu_99', content:...}`. The `tool_use_id` must match the originating `tool_use` id; `tool_result` goes in a USER message.
- **Q:** A teammate sets `max_turns=5` as the way their agent knows it's finished. What's the conceptual error?
  **A:** `max_turns` is a safety cap (defaults to no limit), not a completion signal. The agent finishes when Claude returns a response with no tool calls (`stop_reason end_turn`). Hitting `max_turns` yields `error_max_turns` — an abnormal stop, not normal completion.
- **Q:** Why does adding a text block right after a `tool_result` block sometimes cause Claude to return an empty response with `stop_reason end_turn`?
  **A:** It teaches Claude to expect user text after every tool use, so it ends its turn to follow that pattern. Send `tool_result` blocks alone, with no trailing text.
- **Q:** A response contains a client `tool_use` block plus a `server_tool_use` block with no result, and `stop_reason` is `tool_use`. What must your next request contain?
  **A:** A user message with only the `tool_result` block(s) for the client tool(s), with the same `tools` array as before. The API then runs the pending server tool; adding trailing text or removing the server tool from `tools` causes a 400.

### Task 1.2: Orchestrate multi-agent systems with coordinator-subagent patterns

**What you need to know**

A coordinator-subagent (hub-and-spoke / orchestrator-worker) system has one lead agent at the hub that decomposes a task, delegates focused subtasks to spoke subagents, aggregates their returned results, and synthesizes a final answer.

The defining constraint is context isolation: each subagent starts in a fresh, separate context window and does NOT inherit the coordinator's conversation history, tool results, or system prompt — the ONLY channel from parent to child is the prompt string passed via the Agent tool (renamed from Task in Claude Code v2.1.63), so the coordinator must explicitly include any file paths, errors, or decisions the subagent needs. In the classic pattern the exam tests, subagents do not talk to each other; the coordinator brokers all routing, error handling, and re-delegation. (Current Claude Code lets a subagent that has the `SendMessage` tool message other *named* agents — that is an opt-in tool capability, not the default hub-and-spoke design.) The named rationale for funneling all inter-subagent communication, errors, and re-delegation through the hub is observability/monitoring — the coordinator is the single vantage point where every cross-agent message and failure can be logged and information flow kept consistent; it is not chosen for lower latency or fewer tokens, and point-to-point subagent links would lose that single vantage point.

In the Agent SDK you define subagents programmatically with the `agents` parameter (each an `AgentDefinition` with `description`, `prompt`, optional `tools`/`model`), or as Markdown files in `.claude/agents/`; Claude auto-delegates by matching the `description`, and you must include `Agent` in `allowedTools` for invocations to auto-approve.

Good orchestration scales effort to query complexity, partitions scope so subagents don't duplicate work, and runs an iterative refinement loop. Main failure modes: vague task descriptions, overly narrow decomposition, and high token cost — which is why current SDKs expose depth, concurrency, and spend caps for subagent trees.

**Key facts**

- Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions; when Claude encounters a task matching a subagent's `description` it delegates, and the subagent works independently and returns results. [source](https://code.claude.com/docs/en/sub-agents)
- A non-fork subagent starts with a fresh, isolated context window: it does NOT see the parent's conversation history, skills already invoked, or files Claude already read. The coordinator composes a delegation message that summarizes the task. [source](https://code.claude.com/docs/en/sub-agents)
- In the SDK, the only content passed from parent to subagent is the Agent tool's prompt string, so the coordinator must include any file paths, error messages, or decisions the subagent needs directly in that prompt. The parent receives the subagent's final report (it may summarize it in its own response unless told to preserve it verbatim). [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- The lead (orchestrator) agent analyzes the query, decomposes it into subtasks giving each subagent an objective, output format, tool/source guidance, and clear task boundaries; it then synthesizes results and decides whether more research is needed (iterative refinement loop). [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- SDK subagents are defined programmatically via the `agents` parameter, each as an `AgentDefinition` whose required fields are `description` (when to use it) and `prompt` (its system prompt), with optional `tools`, `disallowedTools`, `model`, `skills`, `memory`, `maxTurns`, etc. Filesystem agents live in `.claude/agents/`; programmatic agents take precedence over same-named filesystem agents. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- Claude invokes subagents through the `Agent` tool; include `Agent` in `allowedTools` to auto-approve invocations. The tool was renamed from `Task` to `Agent` in Claude Code v2.1.63; it appears as `"Agent"` in `tool_use` blocks but still as `"Task"` in the `system:init` tools list, so detection code should match both names. [source](https://code.claude.com/docs/en/agent-sdk/subagents) (The June claim that `Task` also appears in `result.permission_denials[].tool_name` — reconfirm — not re-verified 2026-10-16.)
- Parallel subagents run concurrently so independent subtasks finish in the time of the slowest one; e.g. run style-checker, security-scanner, and test-coverage subagents simultaneously. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- CHANGED: subagents can spawn their own subagents by default, up to **three layers** below the main conversation (default since v2.1.219); set `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` to change it (`1` turns nesting off). At the limit, Claude Code withholds the `Agent` tool so the subagent does the work itself. History: v2.1.172–v2.1.216 allowed up to five layers and was not configurable; v2.1.217–218 defaulted to one. Omitting `Agent` from `tools` or adding it to `disallowedTools` also prevents spawning. [source](https://code.claude.com/docs/en/sub-agents)
- NEW: concurrency and spend caps for subagent trees — by default spawning a 21st concurrently running subagent fails with `Concurrent subagent limit reached` (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, default `20`); `maxBudgetUsd`/`max_budget_usd` counts subagent spend, refuses further spawns with `Budget limit reached`, stops running background subagents, and ends the query with `error_max_budget_usd`. Requires SDKs bundling Claude Code v2.1.219+. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- NEW: subagents run in the background by default — an Agent tool call that omits `run_in_background` launches a background subagent, and Claude sets `run_in_background: false` when it needs the result before continuing (default since v2.1.198); `background: true` on the definition forces background. Background subagents get a smaller built-in tool set. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- To restrict which subagent types a main-thread agent (run with `claude --agent`) can spawn, use `Agent(agent_type)` allowlist syntax in the tools field, e.g. `tools: Agent(worker, researcher), Read, Bash`. Inside a subagent definition, any type list in parentheses is ignored. [source](https://code.claude.com/docs/en/sub-agents)
- Chaining: for multi-step workflows Claude uses subagents in sequence, each returning results to Claude (the hub), which then passes relevant context to the next subagent — subagents do not pass context to each other directly. [source](https://code.claude.com/docs/en/sub-agents)
- NEW nuance: a subagent that has the `SendMessage` tool starts with a roster of other named agents in the session and can message them by name; this does not require agent teams. It is an optional tool grant, not default spoke-to-spoke routing. [source](https://code.claude.com/docs/en/sub-agents)
- For runs coordinating dozens to hundreds of agents, the `Workflow` tool (TypeScript Agent SDK v0.3.149+; include `Workflow` in `allowedTools` to auto-approve) moves orchestration into a script the runtime executes outside the conversation context — the script, not Claude, decides what runs next and intermediate results live in script variables. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- The `model` field accepts aliases `fable`, `opus`, `sonnet`, `haiku`, `inherit`, or a full model ID (docs example: `claude-opus-5-5`). When omitted, Claude Code resolves it in order: per-invocation `model` parameter → definition `model` → `CLAUDE_CODE_SUBAGENT_MODEL` env var → main conversation's model. [source](https://code.claude.com/docs/en/sub-agents)
- NEW: Claude Opus 5 delegates to subagents more readily than earlier models; with the `claude_code` system prompt preset Claude Code adds a line telling Opus 5 not to call the Agent tool unless asked, but with a custom prompt you must add your own delegation guidance — and set depth/concurrency/spend limits regardless, since prompts only steer. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- Token economics (Anthropic engineering blog, re-verified 2026-10-16): agents use about 4x more tokens than chat interactions and multi-agent systems about 15x more; effort should scale to query complexity — 1 agent / 3-10 tool calls for simple fact-finding, 2-4 subagents / 10-15 calls each for direct comparisons, and more than 10 subagents for complex research with clearly divided responsibilities. The lead spins up 3-5 subagents in parallel, which cut research time by up to 90% for complex queries. [source](https://www.anthropic.com/engineering/multi-agent-research-system)

**Anti-patterns the exam tests**

✅ **Right:** route ALL communication, error handling, and re-delegation through the coordinator hub.

- ❌ letting subagents communicate directly (peer-to-peer) as the default design — the single most commonly misunderstood point (the newer `SendMessage` tool doesn't change the exam's hub-and-spoke principle).
- ❌ justifying centralized routing by latency or token savings rather than observability/consistent error handling/controlled information flow — point-to-point subagent links lose the coordinator's single vantage point for monitoring.
- ❌ assuming subagents automatically inherit the coordinator's full conversation history, system prompt, or prior tool results — they start fresh; only the Agent-tool prompt string crosses the boundary.
- ❌ over-decomposing into too-narrow subtasks, producing incomplete coverage with gaps the coordinator never fills.
- ❌ writing vague subagent task descriptions, causing misinterpretation or duplicated work.
- ❌ using a fixed number of subagents regardless of query complexity instead of scaling effort.
- ❌ treating synthesis as one-shot rather than an iterative refinement loop.
- ❌ ignoring token economics by fanning out many verbose subagents (~15x a chat) — and relying on a prompt alone to bound a subagent tree instead of depth/concurrency/budget caps.
- ❌ forgetting `Agent` in `allowedTools`, so delegation silently fails.
- ❌ confusing a fork (inherits full parent context) with a named subagent (fresh isolated context).

**Self-check (original, concept-based)**

- **Q:** A coordinator spawns subagent A to read a config file and subagent B to validate it against the file's contents. Why does B fail unless the coordinator changes something?
  **A:** Subagents have isolated context and do not inherit each other's or the parent's history. B never saw A's file contents. The coordinator must aggregate A's result and explicitly include the relevant config contents in B's Agent-tool prompt — the prompt string is the only channel into a subagent.
- **Q:** Why is overly narrow task decomposition a risk, and how does the coordinator pattern mitigate it?
  **A:** Splitting into too-fine slices can leave gaps no subagent covers, yielding incomplete coverage. Mitigation: an iterative refinement loop where the coordinator evaluates the synthesis for gaps and re-delegates, plus partitioning scope so coverage is complete without duplication.
- **Q:** You're orchestrating a simple single-fact lookup but spin up 10 parallel subagents. What principle does this violate and what's the cost signature?
  **A:** It violates scaling effort to query complexity (a simple lookup needs ~1 agent with a few tool calls). It wastes tokens — multi-agent systems run ~15x the tokens of a chat — and floods the coordinator's context with redundant returned results.
- **Q:** What is the difference between a named subagent and a fork in terms of inherited context?
  **A:** A named subagent starts from its own definition with fresh, isolated context (only the delegation prompt crosses over). A fork inherits the entire parent conversation, system prompt, tools, and model — dropping the input isolation subagents normally provide.
- **Q:** Routing all inter-subagent communication and errors through the coordinator instead of letting subagents talk peer-to-peer is justified primarily by which property — and what are the wrong justifications to rule out?
  **A:** Observability/monitoring: the coordinator is the single vantage point where all cross-agent traffic, errors, and re-delegation can be logged and information flow kept consistent. It is NOT for lower latency or fewer tokens — point-to-point links would actually be cheaper/faster but would scatter that visibility.
- **Q:** An SDK app running a strong model unexpectedly spawns a deep, wide tree of subagents and runs up cost. Which deterministic controls bound this, and why isn't a prompt instruction enough?
  **A:** Set a spawn-depth limit (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`), a concurrency limit (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`), and a spend cap (`maxBudgetUsd`/`max_budget_usd`, which counts subagent spend). A delegation instruction in the prompt only steers the model; the caps are enforced by the runtime however Claude decides to delegate.

### Task 1.3: Configure subagent invocation, context passing, and spawning

**What you need to know**

A coordinator spawns subagents by calling the built-in Agent tool (renamed from Task in Claude Code v2.1.63; "Task" still appears in the `system:init` tools list). For auto-approval without a permission prompt, the literal tool name `"Agent"` must be in `allowedTools` (Python: `allowed_tools`).

Subagents are defined three ways: programmatically via the SDK `agents` option mapping a name to an `AgentDefinition`; as filesystem Markdown files with YAML frontmatter in `.claude/agents/` (project) or `~/.claude/agents/` (user); or via the built-in `general-purpose` agent (plus Explore/Plan and others in Claude Code) that needs no definition.

The defining property is context isolation: each runs in a FRESH, separate context window and the ONLY parent-to-child channel is the Agent tool's prompt string — file paths, errors, and decisions must be passed explicitly (a fork is the deliberate exception). The subagent's intermediate tool calls stay inside its context; only its final message returns.

`AgentDefinition` requires `description` and `prompt`; the prompt should specify the subagent's goals and quality criteria (what to achieve), not a rigid step-by-step procedure (how to do it), so the subagent retains adaptability. Parallelism is achieved by emitting multiple Agent tool calls in ONE coordinator response (and subagents now run in the background by default). When passing source material, structure it with XML-style tags separating content from metadata.

**Key facts**

- Claude invokes subagents through the built-in `Agent` tool; include `"Agent"` in `allowedTools` (Python: `allowed_tools`) to auto-approve invocations without a permission prompt. Tools not in `allowedTools` that need approval fall through to the permission mode and the `canUseTool` callback (denied in `dontAsk` mode). [source](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- `AgentDefinition` required fields are `description` (when to use the agent) and `prompt` (the agent's system prompt). There is no `systemPrompt` field on `AgentDefinition` — `systemPrompt` exists only as a separate `query()`-level option for the main agent. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- `AgentDefinition` optional fields (current SDK table): `tools` (allowlist; if omitted inherits every tool available to subagents), `disallowedTools` (denylist; also accepts `mcp__server`, `mcp__server__*`, `mcp__*`), `model`, `skills`, `memory` (`'user' | 'project' | 'local'`), `mcpServers`, `initialPrompt` (main-thread only), `maxTurns`, `autoCompactWindow` (NEW, TS v0.3.296+, 100000–1000000 tokens), `background`, `omitClaudeMd` (NEW, TS v0.3.271+), `effort` (`'low'|'medium'|'high'|'xhigh'|'max'|number`), and `permissionMode`. In Python, multi-word fields keep camelCase (`disallowedTools`, `mcpServers`). (`isolation`, `hooks`, `color` are filesystem-frontmatter fields in the Claude Code docs and are no longer listed in the SDK `AgentDefinition` table.) [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- A subagent's context window starts fresh with no parent conversation; the only channel from parent to subagent is the Agent tool's prompt string. The subagent receives its own system prompt + the Agent tool's prompt, project CLAUDE.md (via `settingSources`, unless `omitClaudeMd`), and tool definitions — NOT the parent's conversation history, tool results, system prompt, or preloaded skills (unless listed in `skills`). It does inherit the main session's extended-thinking configuration. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- Multiple subagents run concurrently so independent subtasks finish in the time of the slowest; emit multiple Agent tool calls in a single coordinator response to parallelize. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- Programmatic subagents are defined via the SDK `agents` parameter in `query()` options and take precedence over same-named filesystem agents. When Claude calls the Agent tool without a `subagent_type`, it gets the built-in `general-purpose` subagent; `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` removes that default (such a call then fails with `subagent_type is required`). [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- Filesystem subagents are Markdown files with YAML frontmatter; only `name` and `description` are required. Project scope is `.claude/agents/`, user scope is `~/.claude/agents/`; the Markdown body becomes the system prompt. Frontmatter fields: `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `autoCompactWindow`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `omitClaudeMd`, `effort`, `isolation`, `color`, `initialPrompt`, `experimental`. Claude Code hot-reloads edited agent files in watched directories within seconds. [source](https://code.claude.com/docs/en/sub-agents)
- To explicitly invoke a subagent, name it in the prompt (e.g., "Use the code-reviewer agent to check the authentication module"), bypassing automatic description-based matching. [source](https://code.claude.com/docs/en/agent-sdk/subagents) Adding "use proactively" to the description encourages auto-delegation (reconfirm — not re-verified 2026-10-16; the phrase still appears in the docs' `--agents` example).
- CHANGED: a fork is a subagent that inherits the entire conversation (same system prompt, tools, model, message history) instead of starting fresh; its own tool calls stay out of the main context and only its result returns, and its first request reuses the parent's prompt cache. Start one manually with `/subtask` (v2.1.212+; on v2.1.161–v2.1.211 the command was `/fork`). Claude spawns forks by requesting the `fork` subagent type when "fork mode" is on — on by default in interactive sessions (v2.1.232+), OFF by default in `-p` and the Agent SDK; `CLAUDE_CODE_FORK_SUBAGENT=1` turns it on there, `0` turns it off everywhere. A fork can't spawn further forks. [source](https://code.claude.com/docs/en/sub-agents)
- When using multiple documents, wrap each in `<document>` tags with nested `<document_content>` and `<source>` (and other metadata) subtags, inside an outer `<documents>` wrapper with `index` attributes, so Claude parses content separately from provenance. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- CLI: `--agents` accepts JSON defining session-scoped subagents (with `--print` it can also be a path to a JSON file, v2.1.281+; validated at startup since v2.1.242); `--agent <name>` runs the whole session as that subagent (its tool restrictions and model take over the main thread). Blocking a subagent in settings uses `permissions.deny` with `Agent(name)` syntax (e.g. `"Agent(Explore)"`). [source](https://code.claude.com/docs/en/sub-agents)
- Subagent transcripts are stored at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` and deleted after the `cleanupPeriodDays` setting (default 30 days). When a subagent completes, the Agent tool result includes a text block containing `agentId: <id>` for resuming (resume the same session with `resume: sessionId` and name the agent ID in the prompt); the built-in Explore and Plan agents are one-shot and return no `agentId`. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- NEW: when a subagent hits its `maxTurns` limit, Claude Code marks its output in the Agent tool result as partial so Claude knows the run is unfinished (v2.1.246+), and you can resume it. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- NEW: since v2.1.210 Claude Code scans a subagent's final message for instruction-shaped patterns (harness control-tag imitation, permission-config mentions, `Human:`/`Assistant:` turn markers) and neutralizes/marks them before the parent reads it — it never removes or rewords text. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- Detecting subagent activity: messages from inside a subagent carry `parent_tool_use_id`; in TypeScript they also carry `agent_id` (TS SDK v0.3.292+). [source](https://code.claude.com/docs/en/agent-sdk/subagents)

**Anti-patterns the exam tests**

✅ **Right:** pass all needed context explicitly in the Agent-tool prompt string.

- ❌ assuming a subagent inherits the parent's conversation history, prior tool results, or already-read files.
- ❌ believing parent and subagent share memory / a single context window (each non-fork subagent gets a fresh, isolated one).
- ❌ forgetting `"Agent"` in `allowedTools` and expecting auto-delegation to just work.
- ❌ parallelizing by chaining sequential turns instead of emitting multiple Agent tool calls in ONE response.
- ❌ confusing a fork (inherits full conversation) with a named subagent (fresh context), or assuming a fork can spawn another fork.
- ❌ assuming forks are available by default in an SDK app — fork mode is off in `-p`/SDK unless `CLAUDE_CODE_FORK_SUBAGENT=1`.
- ❌ defining an `AgentDefinition` with only `name`/`tools` but no `description` and `prompt` (both required; `description` drives delegation).
- ❌ writing the coordinator/subagent prompt as a rigid step-by-step procedure instead of goals + quality criteria — specifying *how* rather than *what* removes the subagent's adaptability.
- ❌ looking for a `systemPrompt` field on `AgentDefinition` (it's `prompt`).
- ❌ mixing source URLs/page numbers into the document body as free text instead of structured metadata tags.
- ❌ treating "Task" as wrong — it is the legacy name still visible in `system:init`, though `tool_use` blocks emit "Agent".

**Self-check (original, concept-based)**

- **Q:** A coordinator delegates a bug fix to a subagent but the subagent says it cannot find the error log the coordinator just read. What is the root cause and fix?
  **A:** Subagents start with a fresh, isolated context and do not inherit the parent's tool results or read files. The only parent-to-child channel is the Agent tool's prompt string, so the coordinator must include the log path/contents (or relevant excerpt) explicitly in the delegation prompt.
- **Q:** You want three independent code-review checks to run at the same time rather than one after another. How do you make that happen?
  **A:** Emit multiple Agent tool calls in a single coordinator response. Independent subagents then run concurrently and finish in the time of the slowest, not the sum.
- **Q:** Which two `AgentDefinition` fields are mandatory, and what does each control?
  **A:** `description` (natural-language statement of when Claude should delegate — drives automatic delegation) and `prompt` (the agent's system prompt defining role/behavior). All other fields (tools, model, skills, memory, maxTurns, effort…) are optional.
- **Q:** When would you choose a fork over a named subagent for a side task?
  **A:** Use a fork when the task needs the full background of the current conversation (it inherits the entire history, system prompt, tools, and model) — e.g., exploring divergent approaches from the same starting point. A named subagent is better for isolated, self-contained work starting from its own definition with a fresh context.
- **Q:** A subagent you defined with `maxTurns: 10` returns an incomplete answer. How does the coordinator know, and how do you continue without redoing the work?
  **A:** Current Claude Code marks the Agent tool result as partial when the subagent hits `maxTurns`. Capture the session ID and the `agentId` from the tool result, then resume the same session (`resume: sessionId`) and ask Claude to resume that agent ID; the subagent keeps its full prior history.

### Task 1.4: Implement multi-step workflows with enforcement and handoff patterns

**What you need to know**

Multi-step agentic workflows alternate between the model emitting tool calls and your code returning results: the loop runs while `stop_reason == "tool_use"` until Claude stops for another reason.

Prompt instructions only nudge behavior and have a non-zero failure rate, so when compliance is mandatory (e.g., verify a customer's identity before a refund) you must use a deterministic gate rather than a system-prompt instruction. In Claude Code / the Agent SDK, a `PreToolUse` hook is the canonical programmatic gate: it fires before a tool runs and can return `permissionDecision "deny"` (or exit code 2) to block, e.g. refusing `process_refund` until `get_customer` has returned a verified ID. Prompt-side levers (`tool_choice` auto/any/tool/none, strict tool use, detailed descriptions) shape selection but are not hard prerequisite enforcement between dependent tools — and on the newest models (Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1) forced `tool_choice` (`any`/`tool`) is not even accepted.

For escalation/handoff, pass structured findings (customer ID, root cause, refund amount, recommended action) rather than free-form prose — the tell that you need a structured handoff is "if you're writing a regex to extract a decision from model output, that decision should have been a tool call." When the handoff target is a HUMAN who lacks the conversation transcript (e.g., a support rep receiving an escalation), the agent must compile a structured handoff summary — customer ID/details + root-cause analysis + recommended actions — precisely because the human cannot see the transcript and would otherwise have to re-investigate from scratch.

For multi-concern requests, decompose into subagents that investigate in parallel in isolated context windows and return a concise final message to the orchestrator.

**Key facts**

- The client-tool agentic loop runs while `stop_reason` is `"tool_use"`: Claude emits `tool_use` blocks, your code executes them and returns `tool_result` blocks, and the loop exits on `end_turn`, `max_tokens`, `stop_sequence`, or `refusal`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- Tool-use behavior is steerable but not guaranteed by prompting; to require a call you use `tool_choice`. The four options are `auto` (default with tools), `any` (must use some tool), `tool` (forces a specific named tool), and `none` (default with no tools). Forcing a tool only guarantees that *a* tool is called, not ordering between dependent tools. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- NEW restriction: forced tool use (`any`/`tool`) returns a 400 on Claude Opus 5.5, Sonnet 5.5, Fable 5.1, and Mythos 5.1 — use `auto` plus strict tool use (schema-valid inputs) or structured outputs instead; `auto` and `none` still work. Forced tool use is also unsupported with manual extended thinking (`thinking: {type: "enabled"}`), and where it is accepted, forcing a tool skips thinking (the response starts with the `tool_use` block). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- A `PreToolUse` hook fires before a tool executes and can block it; `hookSpecificOutput.permissionDecision` of `"allow"` skips the permission prompt, `"deny"` prevents the call, `"ask"` prompts the user to confirm, and `"defer"` exits gracefully so the tool can be resumed later. Deny and ask permission rules are still evaluated regardless of what the hook returns. [source](https://code.claude.com/docs/en/hooks)
- `"defer"` is honored only in non-interactive `claude -p` mode and only when Claude makes a single tool call in the turn; the process exits with `stop_reason: "tool_deferred"` and the caller resumes with `claude -p --resume <session-id>` (if the tool is gone on resume: `tool_deferred_unavailable`). [source](https://code.claude.com/docs/en/hooks)
- PreToolUse's old top-level `decision`/`reason` fields are deprecated for this event; the deprecated values `"approve"` and `"block"` map to `"allow"` and `"deny"`. [source](https://code.claude.com/docs/en/hooks)
- Hook exit code 0 = success (stdout parsed as JSON only when it is a single JSON object; silence on `PreToolUse` proceeds), exit code 2 = blocking error (prevents the action on events that can block, feeds stderr back), any other code = non-blocking error — including exit 1, so policy hooks must use `exit 2`. [source](https://code.claude.com/docs/en/hooks)
- For `PostToolUse`, the top-level `decision: "block"` (with a `reason`) adds the reason next to the tool result to send the model back to fix something; Claude still sees the original output (use `updatedToolOutput` to replace it). The tool has already run. [source](https://code.claude.com/docs/en/hooks)
- `tool_choice` `any`/`tool` add more tool-use system-prompt tokens than `auto`/`none`; with no tools provided, `none` uses 0 additional system-prompt tokens. `strict: true` on a tool definition guarantees Claude's tool inputs match the schema exactly; on models that support forced tool use it combines with `tool_choice: {"type":"any"}` to guarantee both a call and schema-valid inputs. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- The orchestrator-worker pattern has a lead agent analyze the query, develop a strategy, and spawn 3-5 subagents in parallel; each runs independently and returns findings to the LeadResearcher, which synthesizes. The LeadResearcher saves its plan to Memory because "if the context window exceeds 200,000 tokens it will be truncated." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- Effective delegation requires each subagent to have an objective, an output format, guidance on tools/sources, and clear task boundaries — a structured handoff specification. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- Subagents run in their own fresh context window; only the final message returns to the parent, and the sole parent-to-child channel is the Agent tool's prompt string. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- `AgentDefinition` fields include required `description` and `prompt`, plus optional `tools`, `disallowedTools`, `model`, `skills`, and others; `tools` restricts what the subagent can do and `model` overrides the default. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- If you find yourself writing a regex to extract a decision from model output, that decision should have been a tool call — structured intent belongs in the schema, not parsed from prose. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- A `SubagentStop` hook can enforce a completion gate on a subagent: returning `decision: "block"` with a `reason` keeps the subagent running and delivers the reason as its next instruction (exit 2 does the same with stderr). [source](https://code.claude.com/docs/en/hooks)

> Correction (2026-10-16): the June note that called a "Workflow tool at TypeScript Agent SDK v0.3.149" REFUTED is itself wrong against current docs — the SDK subagents page states "The `Workflow` tool is available in the TypeScript Agent SDK v0.3.149 and later," with `Workflow` added to `allowedTools` to auto-approve, and Claude Code documents dynamic workflows (scripts that orchestrate dozens–hundreds of subagents). [source](https://code.claude.com/docs/en/agent-sdk/subagents) · [source](https://code.claude.com/docs/en/workflows)

**Anti-patterns the exam tests**

✅ **Right:** enforce a compliance-critical prerequisite with a deterministic `PreToolUse` gate.

- ❌ relying on a system-prompt instruction ("never refund before verifying identity") — prompts have a non-zero failure rate.
- ❌ using `tool_choice` or strict tool use as if it enforced *ordering* between dependent tools — it only forces that *a* tool is called (and forcing isn't accepted at all on the newest models), not that `get_customer` precedes `process_refund`; sequencing needs a hook or app-side check.
- ❌ assuming exit code 0 with JSON blocks a tool, or that exit 1 blocks (only exit 2, or `permissionDecision "deny"`, blocks; exit 0 with no output proceeds; exit 1 is non-blocking).
- ❌ confusing decision values — `"deny"` is the `PreToolUse` `permissionDecision`, while `"block"` is the `PostToolUse`/`Stop`/`SubagentStop` top-level `decision`; not interchangeable (and PreToolUse's old `"approve"`/`"block"` are deprecated).
- ❌ passing free-form prose between agents instead of a structured handoff, then regex-parsing it downstream.
- ❌ escalating to a human with just "agent couldn't resolve" or the raw transcript instead of a compiled summary (customer details + root-cause analysis + recommended actions) — the human lacks the conversation context and must re-investigate from scratch.
- ❌ assuming subagents inherit the parent's conversation/system prompt.
- ❌ running independent investigations sequentially when they could fan out in parallel and synthesize.

**Self-check (original, concept-based)**

- **Q:** A workflow must guarantee that identity verification happens before any refund is processed. Why is a strong system-prompt instruction insufficient, and what enforces it deterministically?
  **A:** Prompt instructions only bias behavior and have a non-zero failure rate, so the model could still call `process_refund` first. A `PreToolUse` hook that returns `permissionDecision "deny"` (or exits 2) unless a verified customer ID exists is a deterministic gate that hard-blocks the refund tool until the prerequisite is met.
- **Q:** What is the difference between `tool_choice="any"` and a prerequisite gate when ordering dependent tools?
  **A:** `tool_choice="any"` only forces that the model calls some tool on a turn (and returns a 400 on models such as Opus 5.5 that don't support forced tool use); it does not enforce that one tool runs before another. Enforcing `get_customer` before `process_refund` requires a hook or application-side check, not `tool_choice`.
- **Q:** When decomposing a multi-concern request across parallel subagents, how does context reach a subagent and how do results come back?
  **A:** Each subagent starts in a fresh context window; the only parent-to-child channel is the Agent tool's prompt string, so shared context must be passed there explicitly. Each subagent returns only its final message to the orchestrator, which synthesizes.
- **Q:** Which hook decision field/value blocks a tool BEFORE it runs versus sends Claude back AFTER a tool ran?
  **A:** Before: `PreToolUse` `hookSpecificOutput.permissionDecision = "deny"`. After: the `PostToolUse` top-level `decision = "block"` (with a reason), which adds feedback next to the already-produced result.
- **Q:** An agent escalates an unresolved ticket to a human support rep. Why is forwarding the raw conversation transcript (or just "I couldn't resolve this") the wrong handoff, and what should the payload contain?
  **A:** The recipient human cannot see the conversation context, so a transcript dump or a bare "couldn't resolve" forces them to re-investigate. The agent should compile a structured handoff summary — customer ID/details, a root-cause analysis, and recommended actions — so the human can act without reconstructing the history.

### Task 1.5: Apply Agent SDK hooks for tool call interception and data normalization

**What you need to know**

Hooks are callback functions in the Claude Agent SDK that run your code at fixed points in the agent loop, giving you DETERMINISTIC control over tool calls — unlike a prompt instruction, which only PROBABILISTICALLY influences the model. Hooks run in your application process, not in the agent's context window, so they don't consume context.

They register through the `hooks` field of agent options (`ClaudeAgentOptions.hooks` in Python; `options.hooks` in TypeScript), keyed by event name, each value an array of matcher objects (`HookMatcher` in Python; `{ matcher, hooks }` in TypeScript). Shell-command hooks in settings files also run when the matching `settingSources`/`setting_sources` entry is enabled (it is for default `query()` options).

`PreToolUse` fires before a tool runs and is where you intercept OUTGOING calls: the callback returns `hookSpecificOutput.permissionDecision` of `"allow"`, `"deny"`, `"ask"`, or `"defer"`, and can rewrite arguments via `updatedInput` (pair it with `"allow"` to auto-approve or `"ask"` to show the user; `"defer"` drops it).

`PostToolUse` fires AFTER a tool returns and is where you normalize the RESULT: set `hookSpecificOutput.updatedToolOutput` to replace the result (e.g., Unix→ISO 8601, numeric codes→labels, redact PII) or `additionalContext` to append — but it cannot block, because the tool already executed. This is the canonical pattern for deterministic compliance enforcement and for normalizing heterogeneous tool/API output formats.

**Key facts**

- `PreToolUse` fires on a tool call request and can block or modify it; `PostToolUse` fires on the tool execution RESULT (after the tool runs). [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- A `PreToolUse` hook permits/blocks via `hookSpecificOutput.permissionDecision` of `"allow"`, `"deny"`, `"ask"`, or `"defer"`; `"deny"` stops the call, `permissionDecisionReason` tells the model why so it avoids retrying, and `"defer"` ends the turn with a result whose `stop_reason` is `"tool_deferred"` so the call can be resumed later. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- CHANGED: to rewrite a tool's arguments before execution, a `PreToolUse` hook returns `updatedInput` inside `hookSpecificOutput`. Pair it with `permissionDecision: "allow"` (auto-approve the modified input) or `"ask"` (show it to the user). Per the current SDK hooks page, if you omit `permissionDecision` "the modified input still applies and flows through the normal permission evaluation"; with `"defer"`, `updatedInput` is ignored. Always return a new object rather than mutating `tool_input`. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- `PostToolUse` replaces the result before Claude sees it by setting `hookSpecificOutput.updatedToolOutput` (works for any tool in both SDKs; the value must match the tool's output shape, and for built-in tools a mismatched value is ignored); `additionalContext` appends information instead of replacing. `updatedToolOutput` only changes what Claude sees — the tool already ran. [source](https://code.claude.com/docs/en/hooks)
- CHANGED wording: the older `updatedMCPToolOutput` field replaces MCP tool output only; the docs say to prefer `updatedToolOutput` (they no longer label it "deprecated" explicitly). [source](https://code.claude.com/docs/en/hooks)
- Operation-specific control fields (`permissionDecision`, `permissionDecisionReason`, `updatedInput`, `additionalContext`, `updatedToolOutput`) live inside `hookSpecificOutput`, which should include `hookEventName`. Universal top-level fields: `continue` (`continue_` in Python; `false` stops processing), `stopReason` (shown to the user when `continue` is false), `suppressOutput` (accepted but has no effect), `systemMessage` (shown to the user, not the model), and `terminalSequence`. [source](https://code.claude.com/docs/en/hooks)
- Registration: Python `ClaudeAgentOptions(hooks={"PreToolUse": [HookMatcher(matcher=..., hooks=[...])]})`; TypeScript `options.hooks = { PreToolUse: [{ matcher: ..., hooks: [...] }] }`. A pipe-separated list like `Write|Edit|NotebookEdit` matches those exact tools; a pattern like `^mcp__` is evaluated as a regex; an omitted matcher matches every event of that type. MCP tools are named `mcp__<server>__<action>`. SDK matchers follow the same rules as settings-file matchers. [source](https://code.claude.com/docs/en/agent-sdk/hooks) (The June details "only letters/digits/`_`/`|` ⇒ exact alternation; any other character ⇒ regex" and "`mcp__memory` matches nothing; use `mcp__memory__.*`" — reconfirm — not re-verified 2026-10-16.)
- When multiple hooks or permission rules apply, `deny` > `defer` > `ask` > `allow` — any hook returning `deny` blocks the operation. Matching hooks for an event run in parallel with non-deterministic completion order, so write each to act independently. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- Matchers filter only by TOOL NAME (for tool events), not file paths or other arguments; to filter on arguments, inspect `tool_input` (e.g., `tool_input.file_path`) inside the callback. Non-tool events match other fields (e.g. `SubagentStart`/`SubagentStop` match agent type; `Stop` ignores matchers). [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- CHANGED: hook timeout is set in seconds via the matcher's `timeout`; when omitted, the event's default applies — 600 seconds for most events (command/HTTP/MCP-tool hooks), 30 s for `UserPromptSubmit`/`PreModelSwitch`/`PostModelSwitch`, 10 s for `MessageDisplay` (June doc said 60 s). A timed-out SDK `PreToolUse` callback means the tool call does NOT run and Claude gets a tool result saying the hook didn't respond (since v2.1.210). [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- Every hook callback receives three arguments — input data (Python `input_data` / TS `input`, sharing `session_id`, `cwd`, `hook_event_name`; `agent_id`/`agent_type` when fired inside a subagent), a tool use ID (Python `tool_use_id` / TS `toolUseID`) correlating `PreToolUse` and `PostToolUse` for the same call, and a context (TypeScript exposes an `AbortSignal` via `context.signal`; Python's context is reserved). Returning `{}` allows the operation unchanged. Returning `{async: true}` (`async_` in Python) lets the agent proceed without waiting, but async outputs can't block, modify, or inject context. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- `PostToolUseFailure` fires on tool execution failure (both SDKs). `SessionStart`/`SessionEnd` are registerable as SDK callbacks in TypeScript only — in Python they are available only as shell-command hooks in settings files loaded via `setting_sources`. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- CHANGED list — events in both SDKs: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PermissionRequest`, `Notification`. TypeScript-only events now include `PostToolBatch`, `UserPromptExpansion`, `MessageDisplay`, `StopFailure`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `PermissionDenied`, `SessionStart`, `SessionEnd`, `Setup`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `Elicitation`, `ElicitationResult`, `ConfigChange`, `InstructionsLoaded`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `DirectoryAdded`. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- `SubagentStart` cannot block creation but can return `additionalContext` injected into the subagent's context before its first prompt; `SubagentStop` input includes `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message`, and `stop_hook_active`. [source](https://code.claude.com/docs/en/hooks)
- NEW: Claude Code hook handler types are `command`, `http`, `mcp_tool`, `prompt`, and `agent` (agent hooks experimental). [source](https://code.claude.com/docs/en/hooks)
- NEW (TS SDK v0.3.236+): a `PostToolUse` callback can return `classifierContext`, a short note for the auto-mode permission classifier (not for Claude). [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- Hook event names are case-sensitive (`PreToolUse`, not `preToolUse`); a frequent failure is putting `updatedInput`/`permissionDecision`/`updatedToolOutput` at the top level instead of inside `hookSpecificOutput`. The TypeScript package is `@anthropic-ai/claude-agent-sdk`; the Python package imports as `claude_agent_sdk`. Hooks may not fire when the agent hits `max_turns`. [source](https://code.claude.com/docs/en/agent-sdk/hooks)

**Anti-patterns the exam tests**

✅ **Right:** block non-compliant calls in `PreToolUse` via `permissionDecision: "deny"`; normalize results in `PostToolUse` via `updatedToolOutput`.

- ❌ using a `PostToolUse` hook to BLOCK a call — it runs after execution and cannot block.
- ❌ trying to NORMALIZE a result in `PreToolUse` — the result doesn't exist yet.
- ❌ relying on a system-prompt rule ("never issue refunds over $500") for a compliance guarantee — prompts are probabilistic.
- ❌ pairing `updatedInput` with `permissionDecision: "defer"` (the rewrite is dropped), or expecting an un-approved rewrite to skip the permission check (without `"allow"`, it still goes through normal permission evaluation).
- ❌ putting `permissionDecision`/`updatedToolOutput` at the top level instead of inside `hookSpecificOutput`.
- ❌ assuming a matcher like `"Bash|Write"` can filter on a file path or argument value — matchers match tool names only.
- ❌ confusing the older shell-hook top-level `decision` field (`approve`/`block`, deprecated for PreToolUse) with the SDK's `permissionDecision` allow/deny/ask/defer in `hookSpecificOutput`.
- ❌ using an `async` hook output to enforce a policy — the agent has already moved on, so async output can't block or modify.

**Self-check (original, concept-based)**

- **Q:** A team needs to guarantee that an agent never calls the `issue_refund` tool for amounts over $1,000 and instead routes to a human queue. Which hook and field, and why not just a prompt rule?
  **A:** Use a `PreToolUse` hook on the refund tool; inspect `tool_input` for the amount and return `hookSpecificOutput.permissionDecision: "deny"` (with `permissionDecisionReason` redirecting to escalation), or `"ask"` to require approval. A prompt rule is only probabilistic; the hook is a deterministic guarantee enforced in code.
- **Q:** An external API returns timestamps as Unix epoch and status as numeric codes, but you want the model to see ISO 8601 dates and human-readable statuses. Where do you do this and with which field?
  **A:** In a `PostToolUse` hook, return `hookSpecificOutput.updatedToolOutput` with the reformatted result (matching the tool's output shape). `PostToolUse` fires after the tool returns and `updatedToolOutput` replaces the result before the model sees it; `PreToolUse` cannot, since the result does not exist yet.
- **Q:** Why does returning `updatedInput` from a `PreToolUse` hook sometimes appear to have no effect?
  **A:** Usual causes: it was placed at the top level instead of inside `hookSpecificOutput`, or it was paired with `"defer"` (which ignores it). Pair it with `"allow"` to auto-approve the rewritten call or `"ask"` to show it; with no decision it still applies but must pass normal permission evaluation.
- **Q:** Two `PreToolUse` hooks match the same call: one returns `allow`, one returns `deny`. What happens?
  **A:** The call is blocked. Hooks run in parallel and `deny` has priority over `defer`, `ask`, and `allow`; any single `deny` blocks the operation.

### Task 1.6: Design task decomposition strategies for complex workflows

**What you need to know**

Anthropic distinguishes two ways to structure multi-step work: workflows, where "LLMs and tools are orchestrated through predefined code paths," and agents, where "LLMs dynamically direct their own processes and tool usage."

The simplest workflow is prompt chaining, which "decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one" — ideal when a task "can be easily and cleanly decomposed into fixed subtasks," trading latency for accuracy. This fits predictable multi-aspect work like a code review with per-file local analysis then a cross-file integration pass: steps are known in advance, easy to debug, each gets full attention.

For open-ended investigation (auditing an unfamiliar codebase, root-causing an elusive bug) the steps cannot be predicted, so you want adaptive decomposition: the lead agent "analyzes [the query], develops a strategy, and spawns subagents," then adjusts the plan as findings arrive. The recipe ordering for such open-ended decomposition is: first map the structure (the territory), then identify the high-impact areas, then build a prioritized plan that adapts as dependencies are discovered — rather than committing to a fixed step list up front.

A key reason to split work across passes/subagents is to preserve focused attention and context — subagents "operat[e] in parallel with their own context windows," each "provides separation of concerns," returning only a summary. The attention-dilution failure mode (cramming many items into one pass so later items get skimmed) is architectural — fix it with a multi-pass / per-item structure, not a bigger context window, stronger model, or merely a better prompt. At very large scale (dozens–hundreds of per-item agents), Claude Code's dynamic workflows codify this per-item fan-out plus a merge/verify step as a rerunnable script.

**Key facts**

- Anthropic distinguishes workflows ("systems where LLMs and tools are orchestrated through predefined code paths") from agents ("systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks"). [source](https://www.anthropic.com/engineering/building-effective-agents)
- Prompt chaining "decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one." [source](https://www.anthropic.com/engineering/building-effective-agents)
- Prompt chaining is "ideal for situations where the task can be easily and cleanly decomposed into fixed subtasks," trading off latency for higher accuracy by making each LLM call an easier task. [source](https://www.anthropic.com/engineering/building-effective-agents)
- In the orchestrator-workers pattern a central LLM "dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results"; the key difference from parallelization is flexibility — "subtasks aren't pre-defined, but determined by the orchestrator based on the specific input." [source](https://www.anthropic.com/engineering/building-effective-agents)
- Agents suit "open-ended problems where it's difficult or impossible to predict the required number of steps, and where you can't hardcode a fixed path," at the cost of "higher costs, and the potential for compounding errors." [source](https://www.anthropic.com/engineering/building-effective-agents)
- In the multi-agent research system the lead agent "analyzes it, develops a strategy, and spawns subagents to explore different aspects simultaneously" because research involves open-ended problems where it's "very difficult to predict the required steps in advance." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- Subagents "facilitate compression by operating in parallel with their own context windows... before condensing the most important tokens for the lead research agent," and each "provides separation of concerns—distinct tools, prompts, and exploration trajectories." [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- Each subagent needs "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries"; vague instructions like "research the semiconductor shortage" caused subagents to misinterpret tasks and duplicate work. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- In Claude Code, each subagent "runs in its own context window with a custom system prompt, specific tool access, and independent permissions" and does its work in its own context, returning only the summary. [source](https://code.claude.com/docs/en/sub-agents)
- CHANGED: Claude Code subagents are Markdown files with YAML frontmatter (only `name` and `description` required) stored at `~/.claude/agents/` (personal) or `.claude/agents/` (project), managed via `/agents`. Built-ins now: Explore (read-only; uses the main conversation's model — no longer Haiku), Plan (inherits model, read-only), general-purpose (all subagent tools), `claude` (catch-all), `statusline-setup` (Sonnet), `claude-code-guide` (Haiku). Explore and Plan start without CLAUDE.md and the git-status snapshot. `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` disables the built-in default in SDK mode. [source](https://code.claude.com/docs/en/sub-agents)
- Explicit prompt chaining (separate API calls) is "still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure"; the most common pattern is self-correction: generate a draft → review against criteria → refine, each step a separate call so you can log, evaluate, or branch. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Delegation guidance (sample prompt in the docs for curbing subagent overuse): "Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams that don't need to share state. For simple tasks, sequential operations, single-file edits, or tasks where you need to maintain context across steps, work directly rather than delegating." The docs warn Opus 4.6 and Opus 5 readily over-delegate. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- NEW comparison of who holds the plan: subagents and skills — Claude, turn by turn (a few delegated tasks per turn); agent teams — a lead agent supervising peer sessions via a shared task list; dynamic workflows — a script the runtime executes (dozens to hundreds of agents per run, intermediate results in script variables, resumable). [source](https://code.claude.com/docs/en/workflows)
- Adaptive thinking is set as `thinking: {type: "adaptive"}`; the `effort` parameter lives in `output_config.effort` (NOT inside the thinking object), with values `low`, `medium`, `high`, `xhigh`, `max` (availability varies by model). CHANGED default: `high` on most models, but `medium` is the default on Claude Opus 5.5 and Claude Haiku 5.5. [source](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost)
- The term "attention dilution" and the explicit two-layer (per-file local + cross-file integration) framing are third-party study-guide framing, NOT Anthropic-official terminology; the primary docs cover related concepts (context isolation, compression, separation of concerns) but not under these labels. [source](https://www.anthropic.com/engineering/multi-agent-research-system)

**Anti-patterns the exam tests**

✅ **Right:** match decomposition strategy to predictability — fixed prompt chain for cleanly decomposable known subtasks, adaptive/agentic for open-ended investigation.

- ❌ applying a fixed sequential pipeline to an open-ended investigation whose steps can't be predicted.
- ❌ reaching for a full autonomous agent when the task cleanly decomposes into known fixed subtasks (paying for unpredictability and compounding-error risk you don't need).
- ❌ treating attention dilution as a model-capability problem and "fixing" it with a larger context window or stronger model, or assuming a better prompt equals a multi-pass per-item architecture — it's structural, solved by per-item passes plus a cross-file integration pass.
- ❌ batching files to reduce within-batch dilution but omitting the cross-file integration pass, so cross-cutting issues go uncaught.
- ❌ giving subagents vague one-line tasks instead of objective + output format + tool/source guidance + clear boundaries.
- ❌ spawning subagents for trivial, sequential, or shared-state work where direct in-context execution is simpler.

**Self-check (original, concept-based)**

- **Q:** A reviewer must analyze 12 changed files and produce one consolidated report. Why is a per-file pass followed by a single cross-file integration pass preferable to feeding all 12 files into one prompt?
  **A:** One giant pass causes attention dilution: early files get deep review, later ones get skimmed, and the same issue may be flagged in one file but missed in another. Per-file passes give each file the full attention budget; the integration pass then catches cross-cutting concerns (data flow, API consistency) no single-file pass can see. It is an architectural fix, not a bigger-model fix.
- **Q:** When should you choose adaptive/orchestrator-style decomposition over a fixed prompt chain?
  **A:** When the task is open-ended and the number and nature of steps can't be predicted up front (auditing an unfamiliar codebase, root-causing a novel bug), so the plan must be revised based on what each step uncovers. Fixed chains are for tasks that decompose cleanly into known subtasks where consistency and easy debugging matter.
- **Q:** Beyond parallel speed, what is the decomposition benefit of giving each subagent its own context window?
  **A:** Context/attention isolation and compression: each subagent explores one aspect in a separate window with its own tools and trajectory (separation of concerns), then returns only the condensed result, so the orchestrator's context isn't flooded with raw logs/search results.
- **Q:** What four things does Anthropic say each delegated subagent task description must contain, and why?
  **A:** An objective, an output format, guidance on tools/sources to use, and clear task boundaries, because vague instructions cause subagents to misinterpret the task, duplicate each other's work, or leave gaps.

### Task 1.7: Manage session state, resumption, and forking

**What you need to know**

A session is the conversation history (prompt, every tool call, every tool result, every response) that Claude Code / the Agent SDK accumulates and writes to disk automatically. Crucially, sessions persist the *conversation*, not the filesystem — reverting file edits requires file checkpointing, not session features.

There are three ways to return to a session:

1. **continue** picks up the most recent session in the current directory (no ID needed).
2. **resume** picks up a specific session by ID or name.
3. **fork** creates a brand-new session whose history is a copy of the original up to the branch point, leaving the original untouched so you can resume either independently.

In the CLI: `--continue`/`-c`, `--resume`/`-r`, and `--fork-session` (with `--resume` or `--continue`); in the SDK they are `query()` options: `continue`/`continue_conversation`, `resume` (takes a session ID), and `forkSession` (TS) / `fork_session` (Python). (Note: "forking a session" is distinct from a "fork subagent" in Task 1.3.)

The key architectural judgment: resume when prior context is mostly still valid; but when underlying files have changed since the session paused, the cached tool results in the transcript are stale and can mislead the agent — either tell the agent what changed on resume, or start a fresh session seeded with a structured summary (often more robust). For cross-host/serverless resumption, current SDKs also offer a `SessionStore` adapter that mirrors transcripts to your own backend.

**Key facts**

- A session contains the prompt, every tool call, every tool result, and every response; the SDK writes it to disk automatically so you can return to it later. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Sessions persist the conversation, not the filesystem. To snapshot and revert file changes the agent made, use file checkpointing instead. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Continue and resume both pick up an existing session and add to it; continue finds the most recent session in the current directory, while resume takes a specific session ID. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Fork creates a new session that starts with a copy of the original's history; the original session ID and history stay unchanged, giving two independent sessions you can resume separately. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- In the SDK, fork is enabled with `forkSession: true` (TS) or `fork_session=True` (Python), set together with `resume=<session_id>`; the fork gets a new `session_id` distinct from the original. Forking branches the conversation history, not the filesystem — a forked agent's file edits are real and visible to any session in the same directory. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Resume and fork require a session ID, read from the `session_id` field on the result message (`ResultMessage` in Python, `SDKResultMessage` in TypeScript), present on every result regardless of success or error; in TS it is also a direct field on the init `SystemMessage`, and in Python it is nested inside `SystemMessage.data`. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Sessions are stored under `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` (or `$CLAUDE_CONFIG_DIR/projects/...`), where `<encoded-cwd>` is the absolute cwd with every non-alphanumeric character replaced by `-` (e.g. `/Users/me/proj` → `-Users-me-proj`); converted names over 200 characters are truncated with a hash appended. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- CHANGED: resume by ID now works from any working directory on the same machine — since v2.1.223 Claude Code searches the current project directory and its git worktrees, then every other project on the machine. Before v2.1.223 (and in SDK versions bundling an older CLI) the lookup was scoped to the current project and its worktrees, so a mismatched cwd silently started a fresh session. The session file must still exist on the current machine. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Common reasons to resume: follow up on a completed task without re-reading files, recover from a limit (`error_max_turns` / `error_max_budget_usd`) by resuming with a higher limit, or restart your process. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- To resume across machines/serverless: NEW — pass a `sessionStore` / `session_store` adapter so the SDK mirrors transcripts to your backend (lookup key derives from the cwd, so resume from a matching `cwd`); OR move the `.jsonl` file into `~/.claude/projects/` on the new host; OR, often more robustly, skip session resume and capture results (analysis, decisions, diffs) as application state passed into a fresh session's prompt. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- CLI: `--resume` / `-r` resumes a specific session by ID or name, accepts an absolute path to a session's `.jsonl` transcript, or shows an interactive picker. Background sessions appear in the picker marked with `bg`; resuming one still running attaches to it (v2.1.285+). [source](https://code.claude.com/docs/en/cli-reference)
- CLI: `--fork-session` — "When resuming, create a new session ID instead of reusing the original (use with `--resume` or `--continue`)." `--continue` / `-c` loads the most recent conversation in the current directory (interactive `--continue` skips `-p`/SDK sessions; `claude -p --continue` includes them); `--session-id` sets a specific session ID that must be a valid UUID; `--name` / `-n` sets a display name resumable via `claude --resume <name>` (`/rename` changes it mid-session). [source](https://code.claude.com/docs/en/cli-reference)
- Python uses `continue_conversation=True`; TypeScript uses `continue: true`; both resume the most recent session in the directory with no ID needed. In Python, `ClaudeSDKClient` tracks the session automatically across `client.query()` calls. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- TypeScript-only: setting `persistSession: false` keeps the session in memory for the call and writes nothing to disk. CHANGED: Python can now suppress transcript writes by setting `CLAUDE_CODE_SKIP_PROMPT_HISTORY` in the `env` option (CLI equivalent: `--no-session-persistence` in print mode). [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- The experimental V2 session API (`createSession()` with `send`/`stream`) was removed in TypeScript Agent SDK 0.3.142; use `query()` with session options instead. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- Session helper functions: TS `listSessions()`, `getSessionMessages()`, `getSessionInfo()`, `renameSession()`, `tagSession()`; Python `list_sessions()`, `get_session_messages()`, `get_session_info()`, `rename_session()`, `tag_session()`. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- NEW: Claude Managed Agents sessions are stateful server-side (conversation history, sandbox state, outputs) and "resume cleanly after pauses" — an alternative to self-managing session files when you don't run your own loop. [source](https://platform.claude.com/docs/en/managed-agents/overview)

**Anti-patterns the exam tests**

✅ **Right:** resume when prior context is valid; start fresh-with-summary when transcript tool results are stale or you're crossing hosts.

- ❌ believing resume or fork can roll back file edits — they branch/restore the conversation only; reverting files requires file checkpointing.
- ❌ assuming forking modifies or consumes the original session — it leaves the original ID and history untouched and produces a distinct new `session_id`.
- ❌ resuming a long-paused session blindly when the repo changed underneath, so the transcript's cached (old) file contents mislead the agent.
- ❌ treating fresh-with-summary as always inferior to resume — it's often more robust when context is stale and remains a recommended cross-host approach.
- ❌ shipping raw `.jsonl` transcript files between machines as the default cross-host strategy (prefer a `SessionStore` adapter or application state).
- ❌ assuming a session file on machine A can be resumed on machine B without a store/copy — local lookup only finds files on the current machine.
- ❌ confusing `--continue` (most recent in this dir) with `--resume` (a specific ID/name).
- ❌ passing a non-UUID to `--session-id`.
- ❌ reaching for the removed TypeScript V2 `createSession()` API instead of `query()` options.

**Self-check (original, concept-based)**

- **Q:** An agent paused mid-task; while idle, a teammate rewrote three of the files it had already read. You want to continue. Why might starting a fresh session with a structured summary beat plain `--resume` here?
  **A:** Resuming replays the transcript, which still contains the agent's earlier tool results — the now-outdated file contents it read before the rewrite. Those stale results can mislead the agent. A fresh session seeded with a summary of prior decisions (without the stale file snapshots) avoids that, forcing a re-read of current state. Alternatively, resume but explicitly tell the agent which files changed.
- **Q:** You fork a session to explore an alternative design, and the forked agent edits some source files. What is the state of the original session and of those files afterward?
  **A:** The original session's ID and conversation history are unchanged and still resumable. But forking branches only the conversation, not the filesystem — the forked agent's file edits are real and visible to any session in that directory. Use file checkpointing to branch/revert files.
- **Q:** In the Agent SDK, which two options must you set together to fork, and where do you obtain the value one of them needs?
  **A:** Set `resume=<session_id>` together with `fork_session=True` (Python) / `forkSession: true` (TypeScript). The `session_id` is read from the result message (`ResultMessage` / `SDKResultMessage`), or in TS from the init `SystemMessage`; the fork returns its own distinct `session_id`.
- **Q:** A serverless worker that handled turn 1 is gone; turn 2 lands on a different container and `resume` starts an empty session. What went wrong and what are the fixes?
  **A:** Session files are local to the machine that wrote them, so the new container has no transcript to find (on older CLIs a different cwd alone could also cause this). Fixes: attach a `sessionStore`/`session_store` adapter so transcripts are mirrored to shared storage (resume from a matching cwd), copy the `.jsonl` into `~/.claude/projects/` before resuming, or skip resume and pass a structured summary of prior results into a fresh session.

## Concept glossary (this domain's appendix slice)

- **Agentic loop** - The while-loop, keyed on `stop_reason`, where the app sends a request, executes tools when Claude returns `tool_use`, appends `tool_result` blocks, and repeats until Claude finishes. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- **stop_reason** - Response field stating why generation stopped: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `pause_turn`, `refusal`, or `model_context_window_exceeded`. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- **stop_details** - Response field that is non-null only for `refusal`, identifying the policy category that triggered it. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- **tool_use block** - An assistant content block requesting a tool call, with fields `type`, `id`, `name`, and an `input` JSON object of arguments. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **tool_result block** - A user-role content block returning a tool's output, with `type 'tool_result'`, a `tool_use_id` matching the call, `content`, and optional `is_error`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **tool_choice** - Controls tool invocation: `auto` (model decides, default with tools), `any` (must call some tool), `tool` (force a named tool), `none` (no tools, default when none provided); `any`/`tool` return 400 on Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- **end_turn** - The most common `stop_reason`; Claude finished naturally and the loop should exit. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- **pause_turn** - `stop_reason` returned when a server-side tool sampling loop hits its iteration limit (default 10); continue by resending the response as-is. [source](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- **Client tool vs server tool** - Client tools (user-defined + `memory`/`bash`/`text_editor`/`computer`/`browser`) require your app to drive the loop and return `tool_result`; server tools (`web_search`, `web_fetch`, `code_execution`, `tool_search`) execute on Anthropic infra. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)
- **Tool Runner** - Beta helper in the Anthropic client SDKs (`client.beta.messages.tool_runner`) that runs the tool-use loop automatically until Claude replies without a tool call or `max_iterations` is reached. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner)
- **Claude Managed Agents** - Beta, server-hosted agent harness (agent, environment, session, events) for long-running work, replacing a self-built loop; requires the `managed-agents-2026-04-01` beta header. [source](https://platform.claude.com/docs/en/managed-agents/overview)
- **max_turns / max_budget_usd (Agent SDK)** - Safety caps on tool-use round trips and estimated spend (default: no limit; budget includes subagents); hitting them yields ResultMessage subtype `error_max_turns` or `error_max_budget_usd`. [source](https://code.claude.com/docs/en/agent-sdk/agent-loop)
- **Hub-and-spoke / orchestrator-worker pattern** - Architecture where one coordinator (hub) decomposes work, delegates to subagents (spokes), and aggregates results; all inter-agent communication flows through the hub. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Coordinator (lead/orchestrator agent)** - The central agent that does task decomposition, dynamic subagent selection, delegation, routing, error handling, aggregation, and synthesis. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Subagent** - A separate agent instance spawned to handle a focused subtask in its own fresh context window, returning only a final summary to the parent. [source](https://code.claude.com/docs/en/sub-agents)
- **Context isolation** - Each non-fork subagent starts with a fresh context excluding the parent's conversation history, system prompt, and tool results; only the Agent-tool prompt string crosses the boundary, and only the subagent's final message returns. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- **AgentDefinition** - SDK object defining a subagent; required fields `description` and `prompt`, optional `tools`, `disallowedTools`, `model`, `skills`, `memory`, `mcpServers`, `maxTurns`, `effort`, `permissionMode`, `background`, `omitClaudeMd`, `autoCompactWindow`, etc. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- **Agent tool (formerly Task)** - The tool Claude calls to spawn a subagent, passing a prompt string; renamed from Task in Claude Code v2.1.63 ("Task" still shown in the `system:init` tools list). Must be in `allowedTools` to auto-approve. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- **Iterative refinement loop** - Coordinator evaluates the aggregated synthesis for gaps and spawns additional subagents or refines strategy until coverage is sufficient. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Scope partitioning** - Assigning each subagent a distinct objective and clear boundaries so spokes don't duplicate work or leave coverage gaps. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Fork subagent** - A subagent that inherits the entire parent conversation instead of starting fresh, dropping the usual input isolation; cannot spawn further forks. Started with `/subtask` (v2.1.212+; formerly `/fork`); fork mode is on by default interactively and off in `-p`/SDK unless `CLAUDE_CODE_FORK_SUBAGENT=1`. [source](https://code.claude.com/docs/en/sub-agents)
- **Nested subagents** - Subagents spawning their own subagents; default limit three layers below the main conversation (v2.1.219+), configurable with `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` (`1` disables nesting). [source](https://code.claude.com/docs/en/sub-agents)
- **Background subagent** - A subagent that runs concurrently with the parent; the default when the Agent call omits `run_in_background` (v2.1.198+); gets a reduced built-in tool set. [source](https://code.claude.com/docs/en/agent-sdk/subagents)
- **Dynamic workflow (Workflow tool)** - A script the runtime executes to orchestrate dozens to hundreds of subagents outside the conversation context; TS Agent SDK v0.3.149+, auto-approve with `Workflow` in `allowedTools`. [source](https://code.claude.com/docs/en/workflows)
- **PreToolUse hook** - A Claude Code/SDK hook that fires before a tool executes and can block it via `permissionDecision "deny"` or exit code 2; the canonical deterministic gate. [source](https://code.claude.com/docs/en/hooks)
- **PostToolUse hook** - A hook firing after a tool returns; transforms/normalizes or appends to the result via `updatedToolOutput` / `additionalContext` but cannot block. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- **permissionDecision** - `PreToolUse` `hookSpecificOutput` field with values `allow`, `deny`, `ask`, `defer` controlling whether a tool call proceeds (`defer` → `stop_reason: "tool_deferred"`, `-p` mode only). [source](https://code.claude.com/docs/en/hooks)
- **updatedToolOutput** - `PostToolUse` `hookSpecificOutput` field that replaces a tool's result before Claude sees it; preferred over the older MCP-only `updatedMCPToolOutput`. [source](https://code.claude.com/docs/en/hooks)
- **updatedInput** - `PreToolUse` `hookSpecificOutput` field that rewrites the tool's arguments; pair with `allow` (auto-approve) or `ask` (show user); ignored with `defer`; without a decision it still applies but goes through normal permission evaluation. [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- **hookSpecificOutput** - Return-object section holding event-specific control fields (`permissionDecision`, `updatedInput`, `updatedToolOutput`, `additionalContext`, `hookEventName`). [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- **Deterministic vs probabilistic enforcement** - Hooks enforce rules in code (deterministic guarantee); prompt instructions only influence the model's behavior (probabilistic). [source](https://code.claude.com/docs/en/agent-sdk/hooks)
- **Prompt chaining** - A workflow that decomposes a task into a fixed sequence of steps where each LLM call processes the previous call's output; best for cleanly decomposable, predictable tasks. [source](https://www.anthropic.com/engineering/building-effective-agents)
- **Workflow (vs agent)** - A system where LLMs and tools follow predefined code paths, as opposed to an agent that dynamically directs its own process and tool use. [source](https://www.anthropic.com/engineering/building-effective-agents)
- **Orchestrator-workers** - A pattern where a central LLM dynamically breaks down a task, delegates subtasks (determined from the input, not pre-defined) to worker LLMs, and synthesizes their results. [source](https://www.anthropic.com/engineering/building-effective-agents)
- **Adaptive/dynamic decomposition** - An approach for open-ended problems where the lead agent develops a strategy and revises the plan based on intermediate findings rather than following a hardcoded path. [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Attention dilution** - Degradation of analysis quality when too many items are processed in a single pass, so later items get shallower review; remedied by per-item multi-pass architecture, not bigger models (third-party study-guide term; primary docs ground the underlying compression/context-window rationale but do not use this label). [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Cross-file integration pass** - A second-layer pass that, after per-item local analysis, checks cross-cutting concerns such as data flow and API consistency across all items (third-party study-guide framing). [source](https://www.anthropic.com/engineering/multi-agent-research-system)
- **Session** - The on-disk conversation history (prompt, tool calls, tool results, responses) the SDK/CLI accumulates, enabling later resumption with full context; persists the conversation, not the filesystem. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- **Continue (--continue / -c)** - Pick up and add to the most recent session in the current directory without tracking a session ID. [source](https://code.claude.com/docs/en/cli-reference)
- **Resume (--resume / -r)** - Pick up a specific past session by ID, name, or `.jsonl` path (or via interactive picker), restoring full prior context; ID lookup spans all projects on the machine since v2.1.223. [source](https://code.claude.com/docs/en/cli-reference)
- **Fork (--fork-session, forkSession / fork_session)** - Create a new session whose history is a copy of an existing session up to the branch point, leaving the original untouched; produces a new session ID. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- **encoded-cwd path** - `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`, where the absolute cwd has every non-alphanumeric char replaced by `-` (names >200 chars truncated + hash). [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- **SessionStore adapter** - `sessionStore` / `session_store` option that mirrors session transcripts to your own backend so another host can resume them. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- **File checkpointing** - The separate mechanism for snapshotting and reverting agent file changes; session resume/fork only affect the conversation, not files. [source](https://code.claude.com/docs/en/agent-sdk/sessions)
- **Fresh-with-summary** - Starting a new session seeded with a structured summary of prior results/decisions instead of resuming a transcript with stale tool results; preferred when context has gone stale or across hosts. [source](https://code.claude.com/docs/en/agent-sdk/sessions)

## Sources
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner
- https://platform.claude.com/docs/en/managed-agents/overview
- https://claude.com/blog/building-agents-with-the-claude-agent-sdk
- https://code.claude.com/docs/en/agent-sdk/agent-loop
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://code.claude.com/docs/en/workflows
- https://www.anthropic.com/engineering/multi-agent-research-system
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/agent-sdk/hooks
- https://www.anthropic.com/engineering/building-effective-agents
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost
- https://code.claude.com/docs/en/agent-sdk/sessions
- https://code.claude.com/docs/en/cli-reference
