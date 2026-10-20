# Domain 4: Prompt Engineering & Structured Output (20% of scored content)

> Generated 2026-06-14; refreshed 2026-10-16 against live docs.
> Study material — grounded in cited primary docs, not an answer key.

## Scope & exam weight

This domain (20% of scored content) covers producing reliable, precise output from Claude: writing explicit criteria to cut false positives, few-shot prompting, enforcing structured output via tool_use and JSON schemas, building validation/retry loops, the Message Batches API, and multi-instance/multi-pass review architectures.

The throughline is that precision and reliability come from *structural* mechanisms (explicit categorical criteria, grammar-constrained schemas, isolated review contexts) rather than from vague calibration language or self-grading.

Expect questions that contrast a structural fix against a plausible-but-soft alternative.

## Task statements

### Task 4.1: Design prompts with explicit criteria to improve precision and reduce false positives

**What you need to know**

Precision in a Claude-powered classifier or reviewer comes from explicit, categorical criteria, not subjective calibration language. Anthropic's "be clear and direct" principle frames Claude as "a brilliant but new employee who lacks context on your norms and workflows."

Vague words like "be conservative" or "only report high-confidence findings" give no decision boundary and do not reduce false positives. The fix is to enumerate exactly which categories to report and which to skip, and to define each severity level with concrete code examples rather than prose.

Anthropic's shipping products embody this. Claude Code's Code Review runs several agents in parallel, then a separate verification step checks each candidate finding against the code to filter false positives. It uses explicit severity markers and is tunable via REVIEW.md. The claude-code-security-review action hard-excludes false-positive-prone categories and runs a dedicated false-positive filtering pass.

**Key facts**

- Anthropic's prompting best-practices guide states Claude responds well to clear, explicit instructions and frames Claude as "a brilliant but new employee who lacks context on your norms and workflows. The more precisely you explain what you want, the better the result." [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- The guide's "Golden rule": show your prompt to a colleague with minimal context; if they'd be confused, Claude will be too. In other words, ambiguity hurts precision. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- The guide advises providing context/motivation behind instructions and using examples to steer output, and for research tasks: "Provide clear success criteria: Define what constitutes a successful answer." [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Claude Code's Code Review runs in four stages: **Find** (several agents examine the diff and surrounding code in parallel), **Verify** ("a verification step checks the candidate findings against the code and filters out false positives"), **Rank** (deduplicated and ranked by severity), **Post**. [source](https://code.claude.com/docs/en/code-review)
- Code Review uses explicit severity levels: 🔴 Important (a bug that should be fixed before merging), 🟡 Nit (a minor issue, worth fixing but not blocking), 🟣 Pre-existing (a bug in the codebase that this PR didn't introduce). Findings can carry a collapsed "Why this was flagged" section explaining how Claude verified the problem. [source](https://code.claude.com/docs/en/code-review-pull-requests)
- REVIEW.md can require evidence before a class of finding is posted to cut false positives, e.g. "behavior claims need a `file:line` citation in the source, not an inference from naming." [source](https://code.claude.com/docs/en/code-review-customize)
- REVIEW.md lets you redefine what 🔴 Important means per repo, state which finding classes are Important vs Nit at most, cap nits (e.g. "report at most five nits"), list paths/categories to skip (e.g. generated code, lockfiles, vendored deps, anything CI already enforces), and set a higher bar for some paths ("in `scripts/`, only report if near-certain and severe"). This is how you disable noisy categories. [source](https://code.claude.com/docs/en/code-review-customize)
- By default Code Review focuses on correctness (bugs that would break production), not formatting preferences or missing test coverage. That scoping choice avoids low-value noise. [source](https://code.claude.com/docs/en/code-review)
- The claude-code-security-review action automatically excludes false-positive-prone categories: denial of service, rate limiting, memory/CPU exhaustion, generic input validation without proven impact, and open redirects. It runs a separate false-positive filtering phase (`findings_filter.py` plus a Claude API client used for false-positive filtering), tunable via the `false-positive-filtering-instructions` input. [source](https://github.com/anthropics/claude-code-security-review)
- Code Review configuration: CLAUDE.md supplies project context, and a change that violates one of its rules becomes a finding "at whichever severity level fits the issue". This replaces the earlier "nit-level" wording. REVIEW.md is a review-only file at the repo root, optionally with subdirectory REVIEW.md files that add checks for changes under that path. The find and verify agents receive it as the repo's review instructions alongside Code Review's default guidance. [source](https://code.claude.com/docs/en/code-review-customize)
- REVIEW.md is read from the PR's base branch or the default branch, never from the PR's own changes. Severity-lowering, path/class exclusions and nit caps in the root file are honored only when the copy read is on a protected branch. [source](https://code.claude.com/docs/en/code-review-customize)
- REVIEW.md was previously described as injected as the highest-priority instruction block and pasted verbatim, with no `@` import expansion. (reconfirm — not re-verified 2026-10-16) [source](https://code.claude.com/docs/en/code-review-customize)
- Code Review review levels: **Quick** (lighter, cheapest), **Standard** (default), **Deep** (most thorough, costliest). An Owner sets these per org or per repo. A review never approves or blocks a PR, and its check run concludes neutral, never failure. [source](https://code.claude.com/docs/en/code-review)
- The local `/code-review` command's effort level trades coverage for confidence. At `low` it reports only the findings it is most confident in, so you see fewer false positives. From `medium` through `max` it broadens coverage. Flags include `--fix`, `--comment`, and `--max-findings <n>|all|default`. `/review` is an alias, and the command was named `/simplify` before v2.1.147. [source](https://code.claude.com/docs/en/code-review-local)
- The local `/code-review` reads your CLAUDE.md but NOT REVIEW.md. REVIEW.md configures only the managed Code Review service. [source](https://code.claude.com/docs/en/code-review-local)
- The check run's Details text ends with a machine-readable comment, parseable via a `bughunter-severity:` marker. It returns JSON with keys in alphabetical order, e.g. `{"nit": 1, "normal": 2, "pre_existing": 0}`, where `normal` is the count of Important findings. Counts include still-open findings from earlier reviews. A missing line means "no verdict", not zero findings. [source](https://code.claude.com/docs/en/code-review-pull-requests)

> Note: The "trust cascade" framing, any specific false-positive percentage, the SQL-injection severity example, and "confidence is for routing, not validity" appear in third-party study material only and are NOT in primary Anthropic docs; do not assert them as Anthropic doctrine.

**Anti-patterns the exam tests**

✅ **Right:** Enumerate exactly which categories to report and skip, define each severity level with concrete code examples, and use categorical rules with clear decision boundaries. Temporarily disable high-false-positive categories while you iterate on their explicit criteria. Use model confidence only to route uncertain items to humans.

- ❌ Treating subjective calibration words ("be conservative," "only report high-confidence findings," "use good judgment") as precision controls. They give no decision boundary.
- ❌ Relying on a self-reported confidence score/threshold as the primary precision lever. Model confidence is poorly calibrated, so use it to route uncertain items to humans, not to define what counts as a valid finding.
- ❌ Leaving a high-false-positive category enabled while you "tune the wording". One noisy category erodes trust in all categories, so temporarily disable it.
- ❌ Defining severity in prose instead of concrete code examples.
- ❌ Writing vague instructions ("check that comments are accurate") instead of a categorical rule ("flag a comment only when its claimed behavior contradicts the actual code").
- ❌ Conflating recall-boosting language ("flag anything suspicious," "be thorough") with precision. These *increase* false positives.
- ❌ Assuming structured output or a JSON schema fixes precision. A schema constrains shape, not which findings are valid.

**Self-check (original, concept-based)**

- **Q:** A reviewer prompt produces too many bogus "inaccurate comment" findings. Which raises precision: "be conservative and only flag high-confidence issues," or "flag a comment only when its claimed behavior contradicts what the code actually does"?
  **A:** The categorical rule. "Be conservative"/"high-confidence" are vague phrases with no decision boundary; the contradiction criterion tells the model exactly what qualifies.
- **Q:** Your security category has a high false-positive rate while your SQL-injection category is accurate. Why not leave both on and keep editing the noisy category's wording?
  **A:** Trust is system-wide: a noisy category makes users dismiss even the accurate alerts. Temporarily disable the high-FP category (skip rules) and iterate on its explicit criteria.
- **Q:** Is attaching a model-reported confidence score and dropping everything below a threshold a sufficient precision strategy?
  **A:** No. Self-reported confidence is poorly calibrated. Use explicit criteria first; confidence is best used to route uncertain items to human review.
- **Q:** How should severity levels be specified to be unambiguous?
  **A:** With concrete code examples per level rather than interpretive prose, so the model isn't left to guess what "serious" means.
- **Q:** A team adds "skip all findings in `src/gen/`" to REVIEW.md inside a feature PR, but that PR's review still flags generated files. Why?
  **A:** Code Review reads REVIEW.md from the base/default branch, never from the PR's own changes. Exclusions are honored only from a protected branch. Merge the REVIEW.md change first.

### Task 4.2: Apply few-shot prompting to improve output consistency and quality

**What you need to know**

Few-shot (multishot) prompting means including a handful of worked input/output examples so Claude infers the exact format, tone, reasoning, and edge-case handling you want, rather than relying on prose alone. The docs call examples "one of the most reliable ways to steer Claude's output format, tone, and structure" and say "a few well-crafted examples (known as few-shot or multishot prompting) improve accuracy and consistency."

Good examples have three properties. They are Relevant (mirror your use case), Diverse (cover edge cases and vary enough that Claude doesn't pick up unintended patterns), and Structured (wrapped in `<example>` tags). The docs recommend including 3–5 examples for best results. The certification guide's phrasing of "2–4 targeted examples" is guide-specific and not in primary docs. For a docs-grounded answer use 3–5 (reconfirmed in live docs 2026-10-16; still reconfirm which number the exam keys on).

For judgment-heavy tasks, show the reasoning for why one label/action was chosen over alternatives, and demonstrate ambiguous-case handling so the model generalizes to novel inputs. The standalone "multishot" page has been consolidated into "Prompting best practices" under "Use examples effectively". The old prompt-engineering overview page now only links there.

Few-shot is also the lever for *extraction* quality on messy inputs, not just for output shape. Use a few examples that map varied real document structures to the exact target output: an inline-citation paragraph vs a bibliography block, or an informal "ships in ~2 wks" vs a structured lead-time field. These reduce hallucination and teach the model to emit a null / "not found" value for a field that is genuinely absent rather than inventing one. Here the examples demonstrate *correct handling of structural variety and missing data*, a different goal from format consistency, and the model generalizes that handling to document layouts you didn't show.

For *guaranteed* machine-parseable format, Structured Outputs is the constraint-level alternative.

**Key facts**

- Examples are "one of the most reliable ways to steer Claude's output format, tone, and structure," and "a few well-crafted examples (known as few-shot or multishot prompting) improve accuracy and consistency." (The earlier wording said "dramatically improve".) [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Good examples must be Relevant (mirror your use case), Diverse (cover edge cases / avoid unintended patterns), and Structured (wrapped in `<example>` tags so Claude can distinguish them from instructions). [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- The docs recommend including 3–5 examples for best results (stated as a Tip). [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Power tip: you can ask Claude to evaluate your examples for relevance and diversity, or to generate additional ones based on your initial set. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Wrap multiple examples in `<examples>` tags with each individual example in `<example>` tags. XML tags help Claude parse prompts that mix instructions, context, examples, and variable inputs, which reduces misinterpretation. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Multishot examples work with thinking: "Worked examples in your prompt shape how Claude approaches similar problems in its own thinking blocks. Present each example as a problem, the method to apply, and the expected answer." This changed from the older advice to put `<thinking>` tags inside examples. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- NEW: On Claude Fable 5.1, Fable 5, Opus 5.5, Opus 5, and Sonnet 5.5, rely on built-in thinking rather than manual chain-of-thought. A prompt that asks the model to write out its reasoning (e.g. in `<thinking>` tags) "may be declined". [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Adding context/motivation behind instructions helps Claude generalize ("Claude is smart enough to generalize from the explanation"), which complements examples for novel-case handling. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Applied to extraction: diverse examples that cover varied source structures and explicitly show the correct output for an absent field (a null / "not found") curb fabrication and generalize to layouts not shown. This extends the Diverse-examples principle to data extraction. (Guide-specific application; the primary docs frame example diversity generally rather than for extraction specifically.) [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- For guaranteed schema/JSON conformance, Structured Outputs uses constrained decoding. For classification, "use either tools with an enum field containing your valid labels or structured outputs." (Note: the docs describe Structured Outputs as the recommended migration away from *prefill* for output formatting, but do NOT state that it "eliminates the need for few-shot examples.") [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Prefilled responses on the last assistant turn are no longer supported starting with Claude 4.6 models (and Claude Mythos Preview); such requests return a 400 error. Earlier models still support prefill, and assistant messages elsewhere in the conversation are unaffected. Use Structured Outputs (or tool enums) instead of prefill to force format on current models. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

**Anti-patterns the exam tests**

✅ **Right:** Use a few (about 3–5) diverse `<example>` blocks that mirror the real use case, cover edge/ambiguous cases, include the reasoning for chosen outcomes, and are wrapped in XML tags. Reach for Structured Outputs to guarantee format on current models.

- ❌ Believing more detailed prose always beats examples. The docs position examples as the more reliable steering mechanism when instructions alone are inconsistent.
- ❌ Using a single example or several near-identical ones. Too few or non-diverse examples cause overfitting instead of generalization; diversity (including edge/ambiguous cases) is required.
- ❌ Cramming in dozens of examples. Guidance caps at roughly 3–5.
- ❌ Letting examples contain errors or inconsistent formatting. Claude learns whatever pattern the examples show.
- ❌ Pasting examples as raw text without XML tags, so Claude blends a demonstration with instructions or treats it as a live task.
- ❌ Reaching for prefill to force JSON on current models. Prefill on the last assistant turn returns 400 on Claude 4.6+; use Structured Outputs.
- ❌ Showing only the final answer with no reasoning when the task needs judgment. Examples that omit the "why one action over alternatives" fail to teach decision-making.
- ❌ Using few-shot only to fix output *shape* and never to demonstrate extraction edge cases. Without examples covering varied document structures and a correct null for missing fields, the model fabricates values for absent data on layouts it wasn't shown.
- ❌ On the newest models (Opus 5.5, Sonnet 5.5, Fable 5.1, etc.), demanding that Claude print its step-by-step reasoning in `<thinking>` tags or a "reasoning" output field. This may be declined (a `reasoning_extraction` refusal). Ask for a short explanation instead and let built-in thinking do the reasoning.

**Self-check (original, concept-based)**

- **Q:** Instructions alone produce a code-review tool whose severity labels are inconsistent across runs. Most effective fix and why?
  **A:** Add a few (about 3–5) diverse `<example>` blocks, each mapping a real snippet to the exact record format (location, issue, severity, suggested fix). Include ambiguous/edge cases with the reasoning for the chosen severity. Examples are the most reliable way to enforce consistent format and teach decision rules.
- **Q:** Why must few-shot examples be diverse and include edge cases?
  **A:** Diverse examples prevent Claude from picking up unintended patterns and let it generalize to novel inputs. Ambiguous-case examples teach how to reason about cases not explicitly pre-specified, rather than pattern-matching.
- **Q:** You need guaranteed valid-JSON extraction every time. Are more few-shot examples the right tool?
  **A:** No. Examples nudge but don't guarantee format. Use Structured Outputs (constrained decoding), or a tool with a strict schema/enum for classification, to enforce conformance at the constraint level.
- **Q:** How should each example be delimited, and why?
  **A:** Wrap each in `<example>` tags (and the set in `<examples>`). XML tags let Claude distinguish demonstrations from instructions and inputs, reducing misinterpretation.
- **Q:** Your extractor invents a delivery date when the document states none, and mis-handles vendors that list sources as a bibliography instead of inline. How does few-shot help, and what must the examples show?
  **A:** Add diverse examples covering both document structures, with at least one that shows the correct output as null / "not found" for the absent date. The examples teach correct handling of structural variety and missing data and generalize to unseen layouts. This beats adding more prose, and it is distinct from using examples only to lock output shape.

### Task 4.3: Enforce structured output using tool use and JSON schemas

**What you need to know**

The most reliable way to get schema-conformant output is to define a tool whose `input_schema` is a JSON Schema and have Claude emit a `tool_use` block, rather than asking it in prose to "return JSON." A client-tool call makes Claude stop with `stop_reason: "tool_use"` and return one or more `tool_use` blocks whose `input` is parsed JSON.

You steer invocation with `tool_choice`: `auto` (default with tools), `any` (must call some tool), `tool` (force a named tool), or `none` (default when no tools given). Where forcing is supported, `any`/`tool` make the API prefill the assistant turn, so no natural-language text precedes the call, and the forced call also skips thinking. **Forcing is now model-dependent.** Claude Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1 reject `any`/`tool` with a 400; there you use `auto` + strict tool use, or structured outputs. Manual extended thinking (`thinking: {type: "enabled"}`) also rejects `any`/`tool`.

Anthropic also offers a GA structured-output capability (no beta header required): strict tool use (`strict: true`) and JSON outputs mode (`output_config.format` with `type: "json_schema"`). Both use grammar-constrained decoding to GUARANTEE the output is schema-valid (no syntax errors, correct types). That covers only SYNTACTIC/structural compliance, not SEMANTIC correctness.

Good schema design (nullable/optional fields, an "other"/"unclear" escape hatch) is a sound design heuristic. The structured-outputs reference page itself is silent on these fabrication-prevention patterns.

**Key facts**

- `tool_choice` has four values: `auto` (default when tools are provided; Claude decides), `any` (must use one of the tools, no specific one), `tool` (forces a named tool, e.g. `{"type":"tool","name":"get_weather"}`), `none` (default when no tools provided). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- With `tool_choice` `any` or `tool`, the API prefills the assistant message to force a tool call, so the model will NOT emit a natural-language response before the tool_use blocks, even if asked. To get explanation plus a tool call, use `auto` and instruct tool use in the user message. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- NEW (changed): forced tool use is not supported everywhere. On **Claude Opus 5.5, Sonnet 5.5, Fable 5.1 and Mythos 5.1**, `any` and `tool` return a 400 error. The docs' substitute is `auto` with strict tool use for schema-valid inputs, or structured outputs for a fixed JSON response shape; `none` still works. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- Changed: with **manual extended thinking** (`thinking: {type: "enabled"}`), `tool_choice` `any` and `tool` are NOT supported and return an error; only `auto` and `none` are compatible. Adaptive thinking itself doesn't block forced tool use (e.g. Opus 5 and Haiku 5.5 accept it). However, on every model that accepts forcing, a forced call skips thinking: the response starts with the `tool_use` block and has no `thinking` block. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- Manual extended thinking (`thinking.type: "enabled"` + `budget_tokens`) is deprecated on Claude Opus 4.6 / Sonnet 4.6 and not accepted on later models, which use adaptive thinking. [source](https://platform.claude.com/docs/en/models/overview)
- A client-tool call makes Claude stop with `stop_reason: "tool_use"` and return one or more tool_use blocks, each with `id`, `name`, and `input` conforming to the tool's `input_schema`. The API can also return `stop_reason: "refusal"`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- Each user-defined tool has `name` (regex `^[a-zA-Z0-9_-]{1,128}$`, up from 64), `description`, and `input_schema` (a JSON Schema object). Optional fields include `input_examples`, `strict`, `cache_control`, `defer_loading`, and `allowed_callers`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- `strict: true` is a top-level tool property. It guarantees tool input strictly follows input_schema via grammar-constrained sampling (e.g. a `passengers:int` field returns `2`, never `"two"` or `"2"`) and that the tool name is always valid. That means type-safe arguments, not factual/semantic correctness. The computer-use and browser-use toolset entries (`computer_toolset_20260801`, `browser_toolset_20260801`) reject `strict: true`. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- On models that support forced tool use, combining `tool_choice {"type":"any"}` with `strict: true` guarantees BOTH that a tool is called AND that its inputs strictly follow the schema. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- Structured outputs offers two modes. JSON outputs (`output_config.format` with `type: "json_schema"` and a schema) constrain the final text response; strict tool use constrains tool-call arguments. They can be used together, in which case Claude may return a `tool_use` block or a text block. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Changed: Structured outputs is GA (no beta header required) on the Claude API, Claude Platform on AWS, Google Cloud and Microsoft Foundry. The old `output_format` parameter is deprecated and "will be removed in the future". It now works only with the `structured-outputs-2025-11-13` beta header, and without it the API returns a 400. The Python SDK v1.0+ raises `TypeError` for `output_format={...}` on `client.beta.messages.create()`. (Previously: "still works for a transition period".) [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- NEW: Structured-outputs supported models: claude-fable-5-1, claude-mythos-5-1, claude-fable-5, claude-mythos-5, claude-mythos-preview, claude-opus-5-5, claude-opus-5, claude-opus-4-8, claude-opus-4-7, claude-opus-4-6, claude-sonnet-5-5, claude-sonnet-5, claude-sonnet-4-6, claude-sonnet-4-5-20250929, claude-opus-4-5-20251101, claude-haiku-5-5, claude-haiku-4-5-20251001. On Amazon Bedrock it is GA only on the legacy Bedrock integration (Opus 4.6 and earlier), not on "Claude in Amazon Bedrock". [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- JSON Schema for structured outputs requires `additionalProperties: false` on every object. It does NOT support numeric constraints (minimum/maximum/multipleOf), string-length (minLength/maxLength), recursive schemas, complex types within enums, or external `$ref`. Array constraints are limited (only minItems 0 or 1). Supported: `enum`, `const`, `anyOf`, `allOf` (not with `$ref`), internal `$ref`/`$def`, `default`, and string formats such as date-time, date, email, uri, uuid. Unsupported features return a 400. SDK helpers strip unsupported constraints into descriptions and validate client-side. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- `pattern` regex support is partial. Supported: `*`, `+`, `?`, simple `{n,m}`, `[]`, `.`, `\d`, `\w`, `\s`, groups. NOT supported: backreferences, lookahead/lookbehind, `\b`/`\B`, and complex `{n,m}` with large ranges. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Complexity limits: 20 strict tools per request (non-strict tools don't count), 24 total optional parameters, 16 parameters with union types (`anyOf` or type arrays), and a 180-second compilation timeout. These are combined totals across all strict schemas in a request. Exceeding internal grammar-size limits returns 400 "Schema is too complex for compilation." [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Compiled schema grammars are cached up to 24 hours from last use. Changing the schema structure or the set of tools invalidates the cache, while name/description-only changes do not. The first request incurs grammar-compilation latency. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Even with structured outputs, output may not match the schema in edge cases. A refusal surfaces as `stop_reason: "refusal"` (HTTP 200, billed), and truncation as `stop_reason: "max_tokens"` (retry with a higher `max_tokens`). A schema property that asks for the model's thinking/step-by-step reasoning may trigger a `reasoning_extraction` refusal; ask for a short explanation instead. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- NEW: Output may differ from `enum` values only in capitalization, with no error or special stop_reason, so compare enum values case-insensitively. Required properties are emitted first, then optional ones, each in schema order. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- NEW: Structured outputs works with batch processing (with the 50% discount), token counting, and streaming. JSON outputs is incompatible with message prefilling. Grammars apply only to Claude's direct output, not to tool calls, tool results, or thinking. Using it injects an extra system prompt, and changing `output_config.format` invalidates the prompt cache for that thread. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- `input_examples` (optional array of schema-valid example inputs) improves correct usage for complex/nested parameters. Invalid examples return 400. It is not supported on server tools or on the computer-use/browser-use client toolsets, and it costs roughly 20–50 tokens per simple example and 100–200 for complex ones. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- Changed: `claude-opus-5-5` (Claude Opus 5.5) is the model used throughout the live tool-use and structured-outputs examples, and the models overview says to start with it "for most workloads". `claude-opus-4-8` is now listed as a legacy (still available) model. Current lineup: `claude-fable-5-1`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`. [source](https://platform.claude.com/docs/en/models/overview)
- **Citations compatibility (resolved 2026-10-16):** Citations (`citations.enabled` on `document`/`search_result` blocks) are incompatible ONLY with JSON outputs — adding `output_config.format` (or deprecated `output_format`) returns a 400 because citations interleave citation blocks with text. Strict tool use (`strict: true`) and forced `tool_choice` are not listed as incompatible on the Citations, Strict tool use, or structured-outputs "Feature compatibility" pages. [source](https://platform.claude.com/docs/en/build-with-claude/citations) [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#feature-compatibility) [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) Practical caveats: a forced `tool_choice` (`any`/`tool`) turn contains only `tool_use` (no text), so it carries no citations — the cited answer comes on the follow-up turn (the search-results docs show forced retrieval → `search_result` blocks in `tool_result` → cited text) [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools#forcing-tool-use) [source](https://platform.claude.com/docs/en/build-with-claude/search-results); and on Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Mythos 5.1 forced `tool_choice` 400s on its own. Citations + `strict: true` in one request was not tested live (reconfirm by test).

> Note: nullable-field / enum "escape hatch" / "unclear" sentinel patterns for fabrication prevention are sound design heuristics, NOT documented structured-outputs API behavior. The reference page documents only the mechanics: optional via omission from `required`, true-null via type arrays/anyOf (which count toward the 16 union-type limit), and enums limited to strings/numbers/bools/nulls.

**Anti-patterns the exam tests**

✅ **Right:** Define a tool with a JSON Schema `input_schema` and set `strict: true` for grammar-constrained, schema-valid arguments. Force the call with `any`/`tool` only on models that accept forcing; on Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Mythos 5.1 use `auto` + strict, or `output_config.format` for a fixed JSON reply. Set `additionalProperties: false` on objects, make uncertain fields optional/nullable with an "other"/"unclear" option, and add separate semantic validation for correctness.

- ❌ Requesting a JSON schema via `output_config.format` in the same request as citation-enabled documents (400) — get the cited text answer first, then extract to JSON in a second call or via a strict tool with explicit provenance fields (quote/source/location).
- ❌ Prompting in prose ("respond only with valid JSON, no other text") and parsing the text reply. This is the unreliable baseline that produces syntax errors, markdown fences, and preambles.
- ❌ Believing strict mode / structured outputs guarantee CORRECT data. They only guarantee schema-valid, correctly typed JSON; values can still be wrong or fabricated.
- ❌ Assuming `tool_choice "auto"` guarantees a tool call. Auto lets Claude answer in plain text; use `any` or a forced `tool` where supported, or JSON outputs mode when you need a guaranteed JSON response.
- ❌ Expecting natural-language reasoning (or a thinking block) before the call while using `any`/`tool`. Forcing suppresses preceding text and skips thinking.
- ❌ Pairing `any`/`tool` with manual extended thinking. It is unsupported and returns an error.
- ❌ Sending `tool_choice: {"type":"tool"}` to Claude Opus 5.5 / Sonnet 5.5 / Fable 5.1 / Mythos 5.1. Those models return 400 for forced tool use.
- ❌ Marking every field required so the model invents values for absent data. Make uncertain fields optional/nullable and add an "other"/"unclear" option.
- ❌ Writing schemas with minLength/maximum/backreference or lookaround regex/recursive refs under strict mode. These are unsupported and can 400.
- ❌ Forgetting `additionalProperties: false` on objects.
- ❌ Putting sensitive data (e.g. PHI) in schema property names, enum/const values, or patterns. Cached schemas don't get the same protections as message content.
- ❌ Still sending the deprecated `output_format` parameter without its beta header. It now returns 400; use `output_config.format`.

**Self-check (original, concept-based)**

- **Q:** On a model that supports forced tool use (e.g. Claude Opus 5), you need Claude to ALWAYS return data shaped like your `extract_metadata` tool with correctly typed arguments. Which two settings combine, and what does each contribute?
  **A:** Set `tool_choice` to `{"type":"tool","name":"extract_metadata"}` (or `{"type":"any"}`) to force the call, and `strict: true` so constrained decoding guarantees schema-valid input. tool_choice guarantees the call happens; strict guarantees the arguments' shape and types.
- **Q:** You move that same request to Claude Opus 5.5 and it starts failing with 400. Why, and what's the documented replacement?
  **A:** Opus 5.5 (also Sonnet 5.5, Fable 5.1, Mythos 5.1) rejects `any`/`tool`. Use `tool_choice: auto` with `strict: true` (and prompting to steer which tool), or use JSON outputs (`output_config.format`) if you just need a fixed JSON response.
- **Q:** A reviewer says "strict tool use means the extracted invoice totals will always be correct." Why wrong?
  **A:** Strict only guarantees syntactic/structural conformance: valid JSON, required fields, correct types. Line items can fail to sum, fields can be mislabeled, or values fabricated while still schema-valid. Semantic correctness needs your own validation.
- **Q:** Your extraction schema marks every field required and Claude keeps inventing values for omitted source data. What schema change reduces this?
  **A:** Make absent-able fields optional/nullable and add an "other"/"unclear"/"unknown" enum option or sentinel, giving the model a truthful way to signal missing data instead of fabricating.
- **Q:** Why might a strict-mode request that previously worked suddenly 400?
  **A:** The strict JSON Schema subset rejects unsupported constraints: numeric (minimum/maximum/multipleOf), string-length, regex with backreferences or lookaround, recursive schemas, external `$ref`, and `additionalProperties` not set to false. Exceeding the complexity limits (20 strict tools, 24 optional params, 16 union-type params) also 400s. Enforce dropped constraints via post-validation instead.
- **Q:** An extraction pipeline sends citation-enabled PDFs and wants both cited quotes and a typed JSON record. Which combination 400s, and which documented design avoids it?
  **A:** `citations.enabled` + `output_config.format` 400s (the only documented citations incompatibility). Do two passes — a cited text answer, then structured extraction (JSON outputs, or a `strict: true` tool on `auto`) that carries quote/source fields — or use a strict tool alongside citations, which is not documented as incompatible.

### Task 4.4: Implement validation, retry, and feedback loops for extraction quality

**What you need to know**

Extraction has two distinct failure layers, treated differently.

1. SCHEMA/SYNTAX errors (malformed JSON, missing required fields, wrong types) are eliminated structurally by Structured Outputs and strict tool use, which use constrained decoding. Anthropic states this means "no retries needed for schema violations."
2. SEMANTIC errors (values that don't sum, a number in the wrong field, a stated total conflicting with a calculated total, hallucinated values for absent data) are NOT caught by schema validation, because a value can be schema-valid yet factually wrong. They need an application-level validation layer (e.g. Pydantic business-rule validators) plus a retry-with-error-feedback loop.

The correct retry pattern sends Claude the original source, its failed extraction, and the SPECIFIC validation errors. For tool calls the API-native mechanism is returning a `tool_result` with `is_error: true` and an instructive message, after which Claude retries 2–3 times.

Key judgment: retries fix format/structural and recoverable reasoning mistakes, but retrying is futile when the information is genuinely ABSENT from the source. Return a null/"not found" with a flag instead of looping until the model fabricates.

A related feedback loop closes back to Task 4.1. Tag each finding with the code construct or rule that triggered it, using an application-level field such as `detected_pattern`. When developers dismiss findings, you can then aggregate dismissals *by pattern*, identify which categories are false-positive-prone, and refine that category's explicit criteria (or temporarily disable it). The field is your own schema, not an API field. Its value is enabling systematic FP analysis across many dismissals rather than one-off corrections. (Code Review itself now reads developers' replies on earlier findings in its next review, and recommends adding a REVIEW.md rule when "the same kind of finding keeps coming back.")

**Key facts**

- Structured Outputs guarantee schema-compliant responses through constrained decoding: "Always valid (No more JSON.parse() errors), Type safe (Guaranteed field types and required fields), Reliable (No retries needed for schema violations)." [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Two independent features: JSON outputs control response format via `output_config.format` (`type: json_schema`, `schema`), and strict tool use (`strict: true`) guarantees schema validation on tool names and inputs. They can be used independently or together. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Strict tool use sets `strict: true` as a top-level tool property and uses grammar-constrained sampling so tool input always matches the schema (e.g. guarantees `passengers: 2`, not `"two"` or `"2"`). This prevents missing required fields and type mismatches. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- The strict-tool-use docs state the benefit: "No need to validate and retry tool calls" for schema conformance. It removes the schema-error retry loop, not the semantic one. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- API-native error-feedback loop: return a `tool_result` block with `is_error: true` and an error message in `content`; Claude incorporates it and continues. For invalid/missing-parameter tool calls (non-strict), "Claude will retry 2-3 times with corrections before apologizing to the user." The docs add: to eliminate invalid tool calls entirely, use strict tool use. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- Error messages should be instructive: "include what went wrong and what Claude should try next (for example, 'Rate limit exceeded. Retry after 60 seconds.')" rather than a generic "failed". This is the doc basis for appending specific validation errors on retry. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- For guaranteed JSON schema conformance, Anthropic advises using Structured Outputs instead of prompt-engineering techniques (a Tip on the Increase output consistency page). Prompt techniques are for general consistency or flexibility beyond strict schemas. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)
- NEW: When migrating away from prefill, the best-practices guide notes "newer models can reliably match complex schemas when told to, especially if implemented with retries". Prompt-plus-retry is a documented fallback, but Structured Outputs is the guaranteed path. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- `tool_result` content from external sources is untrusted. Keep it in `tool_result` blocks (not system prompts or plain user text) to mitigate indirect prompt injection; this matters when feeding source documents back for re-extraction. Tool_result blocks must come FIRST in the user message, before any text. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- Compiled grammars (structured outputs and strict tools) are cached for 24 hours from last use. The first request incurs compilation latency, and changing the schema invalidates the cache. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Changed: Prefilling is NOT supported on "Claude 4.6 and later models and Claude Mythos Preview" (this now covers Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1, etc.). A prefilled last assistant message returns a 400 error; use structured outputs or system-prompt instructions instead. (Previously listed model-by-model ending at Fable 5 / Mythos 5 / Opus 4.8.) [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)
- SDK helper: Python `client.messages.parse()` with a Pydantic model (passed as the SDK argument `output_format=`) transforms the schema, sends it as `output_config.format`, validates the response, and returns `parsed_output`. TypeScript uses `zodOutputFormat()`. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

> Note: field names like `detected_pattern`, `calculated_total`, `stated_total`, and `conflict_detected` are illustrative application-level schema fields, NOT Anthropic API fields. Pydantic is a real SDK helper for defining/validating schemas (e.g. `client.messages.parse`), but using it for *semantic*/business-rule validation is an application pattern, not an API capability. The conformance guarantee is structural, not semantic.

**Anti-patterns the exam tests**

✅ **Right:** On failure, append the SPECIFIC validation errors plus the source and the failed extraction so the model can self-correct. Eliminate schema/syntax errors structurally via Structured Outputs/strict tools, and enforce semantic checks in an explicit application/Pydantic layer. When data is absent from the source, return null/not-found with a flag instead of looping.

- ❌ Retrying the same prompt unchanged on failure. The doc pattern is to append the SPECIFIC validation errors plus the source and the failed extraction so the model can self-correct.
- ❌ Retrying indefinitely when the information is absent from the source. This pressures the model toward hallucination; return null/not-found with a flag instead.
- ❌ Using a schema/syntax guard and assuming the data is therefore CORRECT. Schema validity does not imply semantic validity.
- ❌ Building a custom retry loop to fix malformed JSON or missing required fields. That class of error should be eliminated structurally by Structured Outputs / strict tools.
- ❌ Returning generic error strings like "failed" on retry instead of actionable guidance.
- ❌ Treating semantic checks (calculated vs stated total, cross-field conflicts) as something the schema enforces automatically rather than an explicit application/Pydantic layer.
- ❌ Lowering temperature or adding more examples to fix absent-data hallucination. It is a sourcing problem, not a consistency problem.
- ❌ Treating dismissed findings as one-off noise instead of tagging each with the construct/rule that produced it (e.g. a `detected_pattern` field). Without that label you can't aggregate dismissals to learn which category is false-positive-prone and tune its criteria (the Task 4.1 loop).
- ❌ Treating a `stop_reason: "max_tokens"` or `"refusal"` structured-output response as schema-valid. Both can break schema conformance; check `stop_reason` before parsing.

**Self-check (original, concept-based)**

- **Q:** An extraction passes JSON Schema validation but line-item amounts don't sum to the invoice total. Which layer catches this, and will a structured-outputs guarantee prevent it?
  **A:** A semantic/business-rule layer (e.g. a Pydantic validator comparing a calculated total to the stated total). Structured outputs / strict tools only guarantee schema/type conformance, so they will NOT prevent it.
- **Q:** After two retries with error feedback, the model still can't produce a vendor tax ID because the document lacks one. Correct behavior?
  **A:** Stop retrying and return null / not-found with a flag (e.g. low confidence). Retries fix format and recoverable reasoning errors; when info is absent, further retries only risk hallucination.
- **Q:** What should a retry message include to maximize self-correction?
  **A:** Specific, actionable information: the exact validation errors, plus the original source and the failed extraction. A generic "failed" doesn't help.
- **Q:** Why does `strict: true` remove the validate-and-retry loop for missing required parameters but not for wrong-but-valid values?
  **A:** It uses constrained decoding to force inputs to match the schema, so type errors and missing required fields can't occur. It constrains shape/type, not meaning, so a right-typed but factually wrong value still passes and needs separate semantic validation.
- **Q:** Developers keep dismissing a whole class of "unsafe cast" findings. How do you turn those dismissals into a systematic fix rather than re-tuning blind?
  **A:** Tag each finding with the triggering construct (an app-level `detected_pattern` field). Aggregate dismissals by pattern to confirm which category is false-positive-prone, then refine that category's explicit criteria, or temporarily disable it. That is the 4.4 → 4.1 feedback loop; editing wording without the per-pattern signal is guesswork.

### Task 4.5: Design efficient batch processing strategies

**What you need to know**

The Message Batches API (`POST /v1/messages/batches`) asynchronously processes large volumes of Messages requests at 50% of standard token prices. It is the right tool for latency-tolerant, non-blocking workloads (overnight evals, bulk classification/summarization, moderation). It is the wrong tool for anything blocking a user or pipeline (e.g. a pre-merge CI gate).

Every request carries a developer-supplied `custom_id`. Results return in `.jsonl` in ANY order, so you MUST correlate by `custom_id`, not by position. There is no latency SLA: most batches finish under an hour, but the system only guarantees a result (or an `expired` outcome) within a 24-hour window. After that, incomplete requests expire unbilled.

A single batch is capped at 100,000 requests OR 256 MB, whichever comes first, so large inputs must be chunked. Your tier also caps how many batch requests can sit in the processing queue across all batches. Failures are per-request: resubmit only the failed `custom_id`s. Retry server/api errors directly, but fix the body first for `invalid_request_error`.

A single batched request is one-shot from your code's perspective. There is no interactive round-trip, so you CANNOT execute a *client/custom* tool mid-request and feed a `tool_result` back within that same batched request. Multi-turn client-tool loops must be pre-supplied as conversation turns or run on the synchronous Messages API. (Anthropic-executed *server* tools, e.g. web search, do run inside the batch via the server-side agentic loop, with long turns ending in `stop_reason: pause_turn`.)

> **Exam-keying note [guide-specific]:** The certification guide states flatly that "the batch API does not support multi-turn tool calling within a single request (cannot execute tools mid-request and return results)" and treats that as the correct answer. That maps to the *client-tool* case above. If a question asks whether the batch can call your DB/lookup tool, read the result, then continue, the keyed answer is **no; use the synchronous Messages API**. Answer from the guide's framing on the exam, not from the server-tool nuance.

**Key facts**

- The Batches API charges 50% of standard API prices on all usage (input, output, special tokens). Prompt-caching discounts stack with the batch discount. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Batches process asynchronously with no latency SLA. Most finish in under 1 hour, but results are accessible only when all requests complete OR after 24 hours, whichever comes first; requests not completed within 24 hours expire. Under heavy demand "you may see more requests expiring after 24 hours." [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- A single batch is limited to 100,000 requests OR 256 MB total, whichever comes first. Exceeding 256 MB may return a 413 `request_too_large` error. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Each request requires a unique `custom_id` (1–64 chars, `^[a-zA-Z0-9_-]{1,64}$`). Results return in `.jsonl` and may NOT match input order, so you must match by `custom_id`. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Four per-request result types: `succeeded`, `errored`, `canceled`, `expired`. You are not billed for errored/canceled/expired, and one request's failure does not affect others. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Error handling: an `errored` result of type `invalid_request_error` must have its body fixed before resubmitting; other (server/api) errors can be retried directly. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Batch results are downloadable at `results_url` for 29 days after creation (measured from `created_at`, not `ended_at`). Docs recommend streaming results rather than downloading all at once. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- `processing_status` starts `in_progress` and becomes `ended` once all requests finish (also `canceling` during cancellation; canceled batches end as `ended` with possible partial results). `request_counts` breaks down processing/succeeded/errored/canceled/expired. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Changed: Almost any Messages request can be batched: vision, tool use including all server tools (web search, web fetch, code execution, MCP connectors, advisor, tool search), system messages, multi-turn conversations, extended thinking, and most betas. The only unsupported params (validation error) are now `stream: true`, `speed` (Fast mode), and `max_tokens: 0`. The previously listed `store`/`previous_thread_event_id` (Threads), `cache_hint`, `context_hint`, and `research_preview_2026_02` no longer appear in the docs' list. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Each batched request must have `max_tokens` of at least 1. `max_tokens: 0` (cache pre-warming) is unsupported in a batch because an ephemeral cache entry would expire before the follow-up. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- The batch worker runs the same server-side agentic loop as the synchronous Messages API for *server-executed* tools, running more iterations per turn. Long turns end with `stop_reason: pause_turn` and are continued via a follow-up request (batch or synchronous). This does NOT let you round-trip a *client* tool inside one batched request (no mid-flight execution of your code). The exam guide keys the simpler answer: "batch does not support multi-turn tool calling within a single request." [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Param validation is asynchronous and surfaces only after the batch ends, so Anthropic recommends dry-running one request shape against the synchronous Messages API first. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Batches are scoped to a Workspace and cannot be modified after submission (cancel and resubmit). Delete via `DELETE /v1/messages/batches/{batch_id}` (cancel an in-progress batch first). Because of concurrent processing, batches may slightly exceed a Workspace's spend limit. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Batch processing is NOT eligible for Zero Data Retention (nor HIPAA): "29-day retention; async storage required." [source](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- Batches API rate limits are separate from Messages API limits and shared across all models. They cover RPM to the batch endpoints and the number of batch requests waiting in the processing queue, and they don't affect Messages API rate limits. NEW per-tier figures: max batch requests in processing queue 200,000 (Start) / 300,000 (Build) / 500,000 (Scale), RPM 1,000 / 2,000 / 4,000, and 100,000 requests per batch at every tier. [source](https://platform.claude.com/docs/en/api/rate-limits)
- All active models support the Batches API. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- NEW: On the Message Batches API, Claude Opus 5.5, Opus 5, Sonnet 5.5, Sonnet 5, Haiku 5.5, Opus 4.8, Opus 4.7, Opus 4.6 and Sonnet 4.6 support up to 300k output tokens with the `output-300k-2026-03-24` beta header (vs 128K max output synchronously on current models). [source](https://platform.claude.com/docs/en/models/overview)
- Prompt caching in batches is best-effort (requests run concurrently/out of order), with observed hit rates of 30%–98%. A 1-hour cache duration is suggested since batches can exceed the 5-minute ephemeral lifetime, along with identical `cache_control` blocks in every request. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)

**Anti-patterns the exam tests**

✅ **Right:** Use the Batches API only for latency-tolerant, non-blocking workloads. Correlate every result by `custom_id` and resubmit only the failed `custom_id`s (fixing the body first for `invalid_request_error`). Chunk large jobs under the 100,000-request / 256 MB cap. Treat the 50% discount purely as a cost trade-off for asynchronous, non-guaranteed timing.

- ❌ Using the Batches API as a blocking dependency (pre-merge CI check, live chat reply, any synchronous user-facing path). There is no latency SLA, and a request may take the full 24h or expire.
- ❌ Matching results by position/index instead of `custom_id`. Arbitrary order silently mis-attributes responses.
- ❌ Resubmitting the entire batch when a handful failed. Resubmit only the failed `custom_id`s, and fix the body first for `invalid_request_error`.
- ❌ Cramming an unbounded dataset into one batch. Exceeding 100,000 requests or 256 MB fails (413); chunk large jobs, and remember the per-tier processing-queue cap across all in-flight batches.
- ❌ Expecting guaranteed prompt-cache hits to drive cost models. Hits are best-effort.
- ❌ Assuming results persist indefinitely. They are downloadable for 29 days from creation only.
- ❌ Using `stream: true`, Fast mode (`speed`), or `max_tokens: 0` inside a batch. These are rejected.
- ❌ Treating the 50% discount as a latency feature. It is purely a cost trade-off for asynchronous, non-guaranteed timing.
- ❌ Expecting a batched request to execute a *client* tool and continue from its result. There is no mid-batch round-trip; pre-supply the turns or use the synchronous Messages API. (The exam keys: "batch does not support multi-turn tool calling within a single request.")
- ❌ Routing ZDR-required data through batches. Batch processing isn't ZDR-eligible.

**Self-check (original, concept-based)**

- **Q:** A nightly job classifies 400,000 support tickets feeding a morning dashboard. Why is the Batches API a good fit, and what must you watch for?
  **A:** It is latency-tolerant and non-blocking, so 50% savings and the up-to-24h window are acceptable. But 400,000 exceeds the 100,000-per-batch cap (and possibly 256 MB), so split into at least four batches and correlate every result by `custom_id`. On a lower tier, the processing-queue cap (e.g. 200,000 on Start) also means not all four can be queued at once.
- **Q:** After a batch ends, 30 of 5,000 requests show `errored`. How do you decide what to resubmit?
  **A:** Resubmit only those 30 `custom_id`s. For each, `invalid_request_error` means fix the body before resubmitting; other (server/api) errors can be retried directly. Errored/expired/canceled are not billed.
- **Q:** Why is matching by `custom_id` mandatory rather than optional?
  **A:** Results return in arbitrary order as a single `.jsonl` file, so positional matching would mis-assign responses; `custom_id` is the only reliable correlation key.
- **Q:** You want a batch where Claude calls a DB tool, reads rows, then summarizes. Can the batch path do this?
  **A:** No for a *client* DB tool. A batched request has no mid-flight round-trip, so your code can't run the query and return a `tool_result` inside it; pre-supply the turns or use the synchronous Messages API. (Anthropic-executed server tools do loop in-batch, but the exam keys the plain answer: **batch doesn't support multi-turn tool calling**, so use the synchronous API.)

### Task 4.6: Design multi-instance and multi-pass review architectures

**What you need to know**

A model that generated work is a biased reviewer of it. It retains its generation reasoning and is less likely to question its own committed decisions. Claude Code best practices state directly that "a fresh context improves code review since Claude won't be biased toward code it just wrote."

The architectural lever is context isolation. A non-fork subagent runs in its own context window and starts fresh and isolated, without seeing conversation history. A reviewer subagent therefore sees only the diff and the criteria you give it, not the reasoning that produced the change. This is stronger than asking the same instance to self-review or to use more extended/adaptive thinking, because both still run inside the original reasoning context.

Multi-pass review decomposes work to avoid attention dilution. Run independent local per-file passes (parallelizable via separate subagents, fan-out `claude -p` loops, or `/batch`), then a separate cross-file integration/synthesis pass. This matches the documented self-correction chaining pattern (generate, review against criteria, refine). Agent teams offer a multi-lens variant: separate teammates review the same PR for security, performance, and test coverage, and the lead synthesizes.

For calibrated routing, have the model self-report confidence so high-confidence findings auto-apply and low-confidence ones escalate. But a reviewer told to find gaps manufactures them, so scope it to correctness/requirements only. For high-volume independent review without immediacy, the Message Batches API processes requests independently at 50% lower cost.

**Key facts**

- "A fresh context improves code review since Claude won't be biased toward code it just wrote." [source](https://code.claude.com/docs/en/best-practices)
- The Writer/Reviewer pattern uses two separate sessions. Session A implements; Session B (fresh context) reviews for edge cases, race conditions, and consistency with existing patterns; feedback returns to Session A. [source](https://code.claude.com/docs/en/best-practices)
- Adversarial review step: "A reviewer running in a fresh subagent context sees only the diff and the criteria you give it, not the reasoning that produced the change, so it evaluates the result on its own terms." [source](https://code.claude.com/docs/en/best-practices)
- Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions, working independently and returning only results. [source](https://code.claude.com/docs/en/sub-agents)
- A non-fork subagent "starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read." A fork is the exception and inherits the full parent conversation. [source](https://code.claude.com/docs/en/sub-agents)
- Independent parallel passes: spawn multiple subagents to work simultaneously; "This works best when the research paths don't depend on each other." Many subagents returning detailed results can consume significant main-context. By default, spawning fails once 20 subagents are running (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` changes it). [source](https://code.claude.com/docs/en/sub-agents)
- The over-eager-reviewer caveat: "A reviewer prompted to find gaps will usually report some, even when the work is sound". Chasing every finding leads to over-engineering; tell it to flag only gaps that affect correctness or the stated requirements. [source](https://code.claude.com/docs/en/best-practices)
- The bundled `/code-review` skill "reviews the current diff for bugs in a fresh subagent and returns findings to the session." [source](https://code.claude.com/docs/en/best-practices) Its own page adds that it runs as a background subagent with its own context window, so it doesn't fill your conversation. [source](https://code.claude.com/docs/en/code-review-local)
- The most common chaining pattern is self-correction: "generate a draft → have Claude review it against criteria → have Claude refine based on the review", with each step a separate API call so you can log, evaluate, or branch. With adaptive thinking and subagent orchestration, Claude handles most multistep reasoning internally; explicit chaining is still useful to inspect intermediate outputs or enforce a pipeline. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts)
- NEW: In-prompt self-check ("Before you finish, verify your answer against [test criteria]") catches errors reliably, especially for coding and math. Claude Opus 5 is the exception: it verifies on its own, and carried-over verification instructions cause over-verification. Self-check is still the *same* context, not an independent review. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- "A verification subagent or a dynamic workflow that checks its own findings has a fresh model try to refute the result, so the agent doing the work isn't the one grading it." [source](https://code.claude.com/docs/en/best-practices)
- Fan-out across files: loop `claude -p` per file with `--allowedTools` to pre-approve tools (plus `--permission-mode dontAsk` to deny anything else when unattended). `--output-format` supports text/json/stream-json. NEW: `/batch <instruction>` splits a change across 5 to 30 subagents, each in its own worktree. [source](https://code.claude.com/docs/en/best-practices)
- Subagents are Markdown files with YAML frontmatter in `.claude/agents/` (project) and `~/.claude/agents/` (user). Only `name` and `description` are required. Optional fields: `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`, plus newer `autoCompactWindow`, `omitClaudeMd`, `experimental`. [source](https://code.claude.com/docs/en/sub-agents)
- The subagent `model` field accepts aliases (sonnet/opus/haiku/fable), full IDs (e.g. `claude-opus-5-5`), or `inherit`. If omitted, resolution order is: per-invocation param → frontmatter → `CLAUDE_CODE_SUBAGENT_MODEL` → main conversation's model. [source](https://code.claude.com/docs/en/sub-agents)
- Changed: built-in subagents are Explore (read-only; now runs on the main conversation's model, not Haiku, except it uses the Opus alias when the main session runs Fable on subscription/Console), Plan (inherits model, read-only, plan mode), and general-purpose (all tools, resumable). Explore and Plan skip CLAUDE.md and git status and are one-shot/not resumable. [source](https://code.claude.com/docs/en/sub-agents)
- Changed: a fork inherits the entire parent conversation (same system prompt, tools, model, history). "A fork can't spawn further forks." Fork mode is on by default in interactive sessions (v2.1.232+) and off in `-p`/Agent SDK. `CLAUDE_CODE_FORK_SUBAGENT=1` turns it on everywhere, `0` turns it off. Start one manually with `/subtask` (v2.1.212+; `/fork` on v2.1.161–2.1.211). The earlier "requires v2.1.117+" figure was not found in current docs. [source](https://code.claude.com/docs/en/sub-agents)
- For sustained parallelism beyond one context window, agent teams (experimental, disabled by default; `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) give each teammate its own fully independent context. Teammates don't inherit the lead's conversation history, while subagents work within a single session. (Minimum version v2.1.32+: reconfirm — not re-verified 2026-10-16.) [source](https://code.claude.com/docs/en/agent-teams)
- NEW: The agent-teams docs' "Run a parallel code review" example spawns three teammates on one PR, one each for security, performance, and test coverage, because "a single reviewer tends to gravitate toward one type of issue at a time". The lead synthesizes the findings. [source](https://code.claude.com/docs/en/agent-teams)
- The Message Batches API processes each request independently at 50% lower cost, with most batches finishing under 1 hour, a hard 24-hour expiration and a 100,000-request / 256 MB limit. It is not eligible for Zero Data Retention. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)

**Anti-patterns the exam tests**

✅ **Right:** Use a fresh isolated context (separate session or non-fork subagent) that sees only the diff and criteria for bias-free review. Decompose large diffs into independent local passes plus a separate integration pass, and parallelize only when paths are independent. Scope reviewers to correctness/requirements, and verify rather than trust self-reported confidence.

- ❌ Asking the SAME instance that wrote the code to "carefully review its own work". It still holds the generation reasoning and rationalizes its decisions; a fresh context removes the bias.
- ❌ Assuming more extended/adaptive thinking, a higher effort setting, or an in-prompt "verify before you finish" instruction substitutes for an independent reviewer. These all still run inside the original reasoning context.
- ❌ Running one monolithic review pass over a large multi-file diff and expecting it to catch both local bugs and cross-file integration issues. This dilutes attention; use independent local passes plus a separate integration pass.
- ❌ Spawning parallel review subagents for findings that depend on each other (parallel works only when paths are independent), or spawning so many that their results flood the main context.
- ❌ Chasing every finding a gap-seeking reviewer reports. Scope it to correctness/requirements only.
- ❌ Using a fork (which inherits the full parent conversation) when you need a bias-free reviewer. A fork drops the input isolation that makes review independent.
- ❌ Treating self-reported confidence as ground truth without verification, or triaging every finding equally.

**Self-check (original, concept-based)**

- **Q:** Why is self-review weaker than a separate review instance, even with extended thinking enabled?
  **A:** The generating instance retains its own reasoning and defends decisions it already made, and extended/adaptive thinking still runs inside that same context. A fresh isolated context (separate session or non-fork subagent) sees only the diff and criteria and evaluates on its own terms.
- **Q:** How should you structure review of a 40-file change covering both per-file bugs and architecture consistency?
  **A:** Run independent local passes per file/unit (parallelizable via subagents, fan-out `claude -p`, or `/batch`), then a separate cross-file integration pass to reconcile findings. One monolithic pass dilutes attention.
- **Q:** What is the documented risk of a reviewer subagent and how do you mitigate it?
  **A:** A reviewer prompted to find gaps reports some even when work is sound, causing over-engineering. Scope it to flag only gaps affecting correctness or stated requirements.
- **Q:** How does self-reported confidence enable calibrated routing?
  **A:** Having the model report confidence per finding lets you auto-apply high-confidence findings and escalate low-confidence ones, instead of triaging everything equally.
- **Q:** With fork mode on by default, Claude delegates your "review my change" request to a fork. Is that a good independent reviewer?
  **A:** No. A fork inherits the whole conversation, including the reasoning that produced the change, so it carries the same bias. Ask for a non-fork reviewer subagent (or `/code-review`, or a separate session) that sees only the diff and criteria.

## Concept glossary (this domain's appendix slice)

- **Explicit categorical criteria** - Instructions that enumerate exactly what to report and what to skip (and at what severity), replacing subjective calibration language. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **False positive** - An incorrect finding the model flags that isn't actually a problem; the metric Task 4.1 aims to reduce. [source](https://code.claude.com/docs/en/code-review)
- **Precision vs recall** - Precision is the share of flagged findings that are correct; recall is the share of real issues caught. `/code-review` at `low` effort favors precision (fewer false positives); `medium`–`max` broaden coverage (recall). [source](https://code.claude.com/docs/en/code-review-local)
- **Verification step** - A separate stage in Code Review that checks each candidate finding against the code to filter false positives before posting. [source](https://code.claude.com/docs/en/code-review)
- **Verification bar / evidence requirement (REVIEW.md)** - A REVIEW.md instruction requiring evidence (e.g. a `file:line` citation) before a class of finding is posted, cutting false positives. [source](https://code.claude.com/docs/en/code-review-customize)
- **Severity levels** - Code Review's explicit finding tiers: Important (🔴), Nit (🟡), Pre-existing (🟣); redefinable per repo in REVIEW.md. [source](https://code.claude.com/docs/en/code-review-pull-requests)
- **Review level (Quick / Standard / Deep)** - Owner-set thoroughness/cost setting for the managed Code Review service; Standard is the default. [source](https://code.claude.com/docs/en/code-review)
- **False-positive filtering phase** - A dedicated stage in the security-review action that removes low-impact/FP-prone findings via a Claude API call and excluded categories. [source](https://github.com/anthropics/claude-code-security-review)
- **Few-shot / multishot prompting** - Including a small number of worked input/output examples to steer Claude's format, tone, structure, and reasoning. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Zero-shot prompting** - Asking Claude to perform a task with instructions only and no examples; contrasted with few-shot when consistency is insufficient. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **`<example>` / `<examples>` tags** - XML tags that wrap individual examples (and the example set) so Claude treats them as demonstrations distinct from instructions. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Relevant / Diverse / Structured** - The three properties of effective examples: mirror the real use case, cover edge cases without unintended patterns, and be wrapped in XML tags. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Structured Outputs** - GA feature using constrained decoding to force Claude's response (or tool input) to match a JSON schema, guaranteeing valid, schema-compliant output. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **Grammar-constrained decoding (constrained decoding)** - Compiling a JSON Schema into a grammar and restricting token sampling so output must conform; backs both Structured Outputs and strict tool use. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **Prefill** - Putting partial assistant text on the last turn to constrain format; unsupported on Claude 4.6 and later models and Mythos Preview (returns 400), and incompatible with JSON outputs. Use Structured Outputs instead. [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)
- **`tool_use` (stop_reason / content block)** - The response state and block type returned when Claude calls a client tool; carries id, name, and parsed-JSON input your code executes. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **`tool_choice`** - Request parameter controlling invocation: auto (default with tools), any (must call some tool), tool (force a named tool), none (default without tools). `any`/`tool` are rejected by Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1 and by manual extended thinking. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- **Forced tool use** - `tool_choice` `any`/`tool`; prefills the assistant turn and skips thinking on models that accept it; replaced by `auto` + strict tool use or `output_config.format` on models that reject it. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- **`input_schema`** - The JSON Schema object on a tool definition specifying expected parameters; compiled into a decoding grammar under strict mode. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- **Strict tool use (`strict: true`)** - Tool-definition flag using grammar-constrained sampling to guarantee tool inputs exactly match the input_schema (types and required fields). [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- **JSON outputs mode (`output_config.format`)** - Structured-outputs mode that constrains Claude's final text response to a supplied json_schema; replaces the deprecated `output_format`. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **`additionalProperties: false`** - Required on every object in a structured-output/strict schema; forbids fields not declared in properties. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **`input_examples`** - Optional array of schema-valid example inputs on a tool definition that improves correct usage for complex/format-sensitive parameters. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- **`reasoning_extraction` refusal** - Refusal that can fire when a prompt, schema property, or tool parameter asks the model to write out its thinking/step-by-step reasoning; ask for a short explanation instead. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **`is_error` (tool_result)** - Optional boolean on a tool_result block; set true to signal a tool/validation error so Claude incorporates it and retries (2–3 times) with corrections. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **Schema/syntax error** - Malformed JSON, missing required field, or wrong type; eliminated structurally by Structured Outputs/strict tools, not requiring retries. [source](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- **Semantic validation error** - Output that is schema-valid but factually wrong (values don't sum, wrong field, stated vs calculated conflict); requires an application-level validation layer (Anthropic docs do not name these fields). [source](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency)
- **Retry-with-error-feedback** - Re-prompting that appends specific validation errors plus the source and failed extraction so the model self-corrects; effective for format/recoverable errors, futile when data is absent. [source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- **Message Batches API** - Anthropic endpoint (`POST /v1/messages/batches`) for asynchronous, cost-reduced bulk processing of Messages requests. [source](https://platform.claude.com/docs/en/api/messages/batches/create)
- **`custom_id`** - Developer-supplied unique ID (1–64 chars, `^[a-zA-Z0-9_-]{1,64}$`) on each batch request used to correlate out-of-order results back to their requests. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **`processing_status`** - Batch-level state that starts `in_progress` and becomes `ended` when all requests finish (also `canceling` during cancellation). [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **`request_counts`** - Batch summary object counting requests in each state: processing, succeeded, errored, canceled, expired. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **`results_url`** - URL on a completed batch from which `.jsonl` per-request results are downloaded; populated only once processing has ended. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **`expired` (result type)** - Outcome for a request the batch could not process within its 24-hour window; not billed. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **24-hour processing window** - Maximum batch lifetime; results become available when all requests complete or at 24h, whichever first, and unfinished requests then expire. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **50% batch discount** - All Batches API token usage is billed at half the standard price; stacks with prompt caching. [source](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **Processing-queue limit** - Per-tier cap on batch requests awaiting processing across all batches (200k Start / 300k Build / 500k Scale), separate from the 100k-per-batch cap. [source](https://platform.claude.com/docs/en/api/rate-limits)
- **Self-review limitation** - A model under-questions work it generated in the same session because it retains and defends its own generation reasoning. [source](https://code.claude.com/docs/en/best-practices)
- **Writer/Reviewer pattern** - Two-session pattern: one Claude implements, a second with fresh context reviews, and feedback flows back to the writer. [source](https://code.claude.com/docs/en/best-practices)
- **Subagent** - A Claude Code assistant running in its own context window with its own system prompt, tools, and permissions, returning a summary. [source](https://code.claude.com/docs/en/sub-agents)
- **Fork** - A subagent that inherits the entire parent conversation instead of starting fresh; drops the input isolation a bias-free reviewer needs; cannot spawn further forks. [source](https://code.claude.com/docs/en/sub-agents)
- **Multi-pass review** - Independent local per-file passes plus a separate cross-file integration pass to avoid attention dilution. [source](https://code.claude.com/docs/en/sub-agents)
- **Self-correction chaining** - Generate a draft, review against criteria, then refine, each a separate call for logging/branching. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts)
- **Confidence calibration / routing** - Model self-reports confidence per finding so high-confidence results auto-apply and low-confidence ones escalate. (Exam-guide concept; reconfirm — not re-verified 2026-10-16 in primary docs.) [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts)
- **Fan-out** - Distributing independent passes across many parallel `claude -p` invocations, scoped with `--allowedTools` (or `/batch` across 5–30 worktree subagents). [source](https://code.claude.com/docs/en/best-practices)
- **Agent teams** - Experimental mode where each teammate runs in its own fully independent context window (beyond a single session), coordinated by a lead. [source](https://code.claude.com/docs/en/agent-teams)

## Sources

- https://platform.claude.com/docs/en/build-with-claude/citations
- https://platform.claude.com/docs/en/build-with-claude/search-results
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#chain-complex-prompts
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/build-with-claude/batch-processing
- https://platform.claude.com/docs/en/api/messages/batches/create
- https://platform.claude.com/docs/en/api/rate-limits
- https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- https://platform.claude.com/docs/en/models/overview
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- https://code.claude.com/docs/en/code-review
- https://code.claude.com/docs/en/code-review-customize
- https://code.claude.com/docs/en/code-review-pull-requests
- https://code.claude.com/docs/en/code-review-local
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/agent-teams
- https://github.com/anthropics/claude-code-security-review
