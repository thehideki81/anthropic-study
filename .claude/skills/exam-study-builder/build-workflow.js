export const meta = {
  name: 'exam-study-builder',
  description: 'Deep-research + verify + write per-domain study docs for Claude Certified Architect – Foundations',
  phases: [
    { title: 'Research', detail: 'one research agent per task statement, fanned across all 5 domains' },
    { title: 'Verify', detail: 'adversarially verify version-specific claims per task statement' },
    { title: 'Write', detail: 'one writer agent per domain assembles and writes the doc' },
  ],
}

const GEN_DATE = args && args.date ? args.date : '2026-06-14'
const OUT = (args && args.outDir) ? args.outDir : 'reference/study'  // pass the absolute path via args.outDir

// ---- Syllabus (verbatim task-statement titles + concise research targets) ----
const DOMAINS = [
  {
    num: 1, weight: 27, slug: 'domain-1-agentic-architecture',
    title: 'Agentic Architecture & Orchestration',
    scope: 'Building agentic loops and multi-agent (coordinator/subagent) systems with the Claude Agent SDK: loop control via stop_reason, Task-tool subagent spawning, context passing, hooks, task decomposition, and session resume/fork. Maps to the Customer Support, Multi-Agent Research, and Developer Productivity scenarios.',
    tasks: [
      { id: '1.1', title: 'Design and implement agentic loops for autonomous task execution',
        targets: 'The agentic loop lifecycle: send request -> inspect stop_reason ("tool_use" vs "end_turn") -> execute tools -> append tool_result blocks to conversation history -> loop. Model-driven decision-making vs pre-configured decision trees. Anti-patterns: parsing natural-language signals for termination, arbitrary iteration caps as the PRIMARY stop mechanism, checking assistant text content as a completion indicator. Confirm the exact stop_reason values and how tool_result/tool_use content blocks are structured in the Messages API.' },
      { id: '1.2', title: 'Orchestrate multi-agent systems with coordinator-subagent patterns',
        targets: 'Hub-and-spoke: coordinator manages all inter-subagent communication, error handling, routing. Subagents have isolated context (do NOT inherit coordinator history automatically). Coordinator does task decomposition, delegation, aggregation, dynamic subagent selection by query complexity. Risk: overly narrow decomposition -> incomplete coverage. Iterative refinement loops (evaluate synthesis for gaps, re-delegate). Partition scope to minimize duplication.' },
      { id: '1.3', title: 'Configure subagent invocation, context passing, and spawning',
        targets: 'The Task tool spawns subagents; allowedTools must include "Task". Subagent context must be explicitly provided in the prompt (no automatic inheritance / no shared memory). AgentDefinition config: description, prompt/systemPrompt, tools restrictions. Fork-based sessions for divergent approaches. Parallel subagents = multiple Task calls in ONE coordinator response. Structured data formats to separate content from metadata (source URLs, doc names, page numbers). Confirm Agent SDK AgentDefinition fields and how subagents are defined.' },
      { id: '1.4', title: 'Implement multi-step workflows with enforcement and handoff patterns',
        targets: 'Programmatic enforcement (hooks, prerequisite gates) vs prompt-based guidance. Prompt instructions have non-zero failure rate -> use deterministic gates when compliance is required (e.g., identity verification before financial ops; block process_refund until get_customer returned a verified ID). Structured handoff protocols for escalation (customer ID, root cause, refund amount, recommended action). Decompose multi-concern requests, investigate in parallel with shared context, synthesize.' },
      { id: '1.5', title: 'Apply Agent SDK hooks for tool call interception and data normalization',
        targets: 'Hook patterns: PostToolUse intercepts tool RESULTS for transformation before the model sees them; tool-call interception hooks intercept OUTGOING calls to enforce compliance (block refunds above a threshold, redirect to escalation). Hooks = deterministic guarantees vs prompt = probabilistic. Normalize heterogeneous formats (Unix timestamps, ISO 8601, numeric status codes). Confirm exact Agent SDK hook names/events (PreToolUse, PostToolUse, etc.) and how a hook blocks/permits a tool call.' },
      { id: '1.6', title: 'Design task decomposition strategies for complex workflows',
        targets: 'Fixed sequential pipelines (prompt chaining) vs dynamic adaptive decomposition based on intermediate findings. Prompt chaining for predictable multi-aspect reviews (per-file analysis then cross-file integration pass). Adaptive plans for open-ended investigation (map structure, identify high-impact areas, prioritized plan that adapts). Avoid attention dilution.' },
      { id: '1.7', title: 'Manage session state, resumption, and forking',
        targets: '--resume <session-name> to continue a named conversation. fork_session for independent branches from a shared baseline. Inform the agent about file changes when resuming after modifications. Starting fresh with a structured summary can beat resuming with stale tool results. Choosing resume (prior context mostly valid) vs fresh-with-summary (stale results). Confirm the exact --resume flag behavior and fork_session option in Claude Code / Agent SDK docs.' },
    ],
  },
  {
    num: 2, weight: 18, slug: 'domain-2-tool-design-mcp',
    title: 'Tool Design & MCP Integration',
    scope: 'Designing tool interfaces and MCP integrations: differentiating tool descriptions, structured error responses (isError, error categories, retryable), tool distribution across agents, tool_choice config, MCP server scoping (.mcp.json vs ~/.claude.json), resources, and built-in tool selection.',
    tasks: [
      { id: '2.1', title: 'Design effective tool interfaces with clear descriptions and boundaries',
        targets: 'Tool descriptions are the PRIMARY mechanism for tool selection; minimal descriptions -> unreliable selection among similar tools. Include input formats, example queries, edge cases, boundaries. Ambiguous/overlapping descriptions cause misrouting (analyze_content vs analyze_document). System-prompt wording affects selection (keyword-sensitive instructions). Splitting generic tools into purpose-specific tools; renaming to eliminate overlap.' },
      { id: '2.2', title: 'Implement structured error responses for MCP tools',
        targets: 'The MCP isError flag pattern. Distinguish transient (timeouts/unavailability), validation (bad input), business (policy violation), permission errors. Uniform "Operation failed" prevents recovery. Retryable vs non-retryable; structured metadata (errorCategory, isRetryable boolean, human-readable description, retriable:false flags) prevents wasted retries. Local recovery in subagents, propagate only unresolvable. Access failures vs valid empty results. Confirm MCP tool result content/isError shape.' },
      { id: '2.3', title: 'Distribute tools appropriately across agents and configure tool choice',
        targets: 'Too many tools (18 vs 4-5) degrades selection reliability. Agents misuse tools outside their specialization. Scoped tool access (least privilege) with limited cross-role tools for high-frequency needs (verify_fact for synthesis agent). tool_choice options: "auto", "any", forced {"type":"tool","name":"..."}. "any" guarantees a tool call (not text); forced ensures a specific tool runs first. Confirm exact tool_choice schema in the Messages API.' },
      { id: '2.4', title: 'Integrate MCP servers into Claude Code and agent workflows',
        targets: 'MCP scoping: project-level .mcp.json (shared team tooling) vs user-level ~/.claude.json (personal/experimental). Env var expansion in .mcp.json (${GITHUB_TOKEN}) for secrets. Tools from all configured servers discovered at connection time, available simultaneously. MCP resources expose content catalogs (issue summaries, doc hierarchies, db schemas) to reduce exploratory tool calls. Enhancing MCP tool descriptions so the agent does not prefer built-in Grep. Prefer community MCP servers for standard integrations. Confirm .mcp.json schema and scopes (local/project/user) in Claude Code docs.' },
      { id: '2.5', title: 'Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively',
        targets: 'Grep = content search (patterns, function names, error messages, imports). Glob = file path pattern matching (**/*.test.tsx). Read/Write = full file ops; Edit = targeted edit via unique text match. When Edit fails on non-unique matches, fall back to Read + Write. Build understanding incrementally (Grep entry points -> Read to follow imports) rather than reading all files upfront. Trace usage via exported names.' },
    ],
  },
  {
    num: 3, weight: 20, slug: 'domain-3-claude-code-config',
    title: 'Claude Code Configuration & Workflows',
    scope: 'Configuring Claude Code for teams: CLAUDE.md hierarchy and @import, .claude/rules/ path scoping, custom slash commands and skills (context: fork, allowed-tools, argument-hint), plan mode vs direct execution, iterative refinement, and CI/CD integration (-p, --output-format json, --json-schema).',
    tasks: [
      { id: '3.1', title: 'Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization',
        targets: 'Hierarchy: user-level ~/.claude/CLAUDE.md (NOT shared via version control), project-level .claude/CLAUDE.md or root CLAUDE.md, directory-level subdirectory CLAUDE.md. @import syntax to reference external files for modularity. .claude/rules/ as an alternative to a monolithic CLAUDE.md. /memory command to verify which memory files are loaded. Confirm CLAUDE.md file locations, @import syntax, and precedence in Claude Code docs.' },
      { id: '3.2', title: 'Create and configure custom slash commands and skills',
        targets: 'Project-scoped commands in .claude/commands/ (shared via VCS) vs user-scoped ~/.claude/commands/. Skills in .claude/skills/ with SKILL.md frontmatter: context: fork (isolated sub-agent context to avoid polluting main conversation), allowed-tools, argument-hint. Personal skill variants in ~/.claude/skills/. Skills (on-demand) vs CLAUDE.md (always-loaded). Confirm SKILL.md frontmatter fields and slash command file format in docs.' },
      { id: '3.3', title: 'Apply path-specific rules for conditional convention loading',
        targets: '.claude/rules/ files with YAML frontmatter paths fields = glob patterns for conditional activation. Path-scoped rules load only when editing matching files (saves tokens / reduces irrelevant context). Glob-pattern rules beat directory-level CLAUDE.md for conventions spanning multiple directories (e.g., **/*.test.tsx, paths: ["terraform/**/*"]). Confirm the rules frontmatter "paths" syntax in docs.' },
      { id: '3.4', title: 'Determine when to use plan mode vs direct execution',
        targets: 'Plan mode = complex tasks, large-scale changes, multiple valid approaches, architectural decisions, multi-file mods; enables safe exploration/design before committing (prevents rework). Direct execution = simple well-scoped changes (single validation check). The Explore subagent isolates verbose discovery and returns summaries. Combining plan-for-investigation with direct-execution-for-implementation. Confirm how plan mode is entered and the Explore subagent in docs.' },
      { id: '3.5', title: 'Apply iterative refinement techniques for progressive improvement',
        targets: 'Concrete input/output examples beat prose for transformations. Test-driven iteration: write tests first, iterate by sharing failures. Interview pattern: have Claude ask questions to surface considerations before implementing. Single message for interacting problems vs sequential for independent problems. 2-3 concrete examples to clarify requirements.' },
      { id: '3.6', title: 'Integrate Claude Code into CI/CD pipelines',
        targets: '-p / --print flag for non-interactive mode (prevents hangs waiting for input). --output-format json and --json-schema for structured CI output (machine-parseable findings for inline PR comments). CLAUDE.md provides project context (testing standards, fixtures, review criteria). Session context isolation: an independent review instance beats the same session that generated the code. Include prior findings to avoid duplicate comments. Confirm the exact CLI flags (-p, --print, --output-format, --json-schema) in Claude Code CLI docs.' },
    ],
  },
  {
    num: 4, weight: 20, slug: 'domain-4-prompt-engineering',
    title: 'Prompt Engineering & Structured Output',
    scope: 'Producing reliable, precise output: explicit criteria to cut false positives, few-shot prompting, structured output via tool_use + JSON schemas, validation/retry loops, the Message Batches API, and multi-instance/multi-pass review.',
    tasks: [
      { id: '4.1', title: 'Design prompts with explicit criteria to improve precision and reduce false positives',
        targets: 'Explicit categorical criteria beat vague instructions ("flag comments only when claimed behavior contradicts actual code" vs "check comments are accurate"). Vague "be conservative"/"only high-confidence" do NOT improve precision. High false-positive categories undermine trust in accurate categories. Temporarily disable high-FP categories; define explicit severity criteria with concrete code examples per level.' },
      { id: '4.2', title: 'Apply few-shot prompting to improve output consistency and quality',
        targets: 'Few-shot examples = most effective technique for consistent, actionable, formatted output when instructions alone are inconsistent. Demonstrate ambiguous-case handling; enable generalization to novel patterns (not just matching pre-specified cases); reduce hallucination in extraction. 2-4 targeted examples showing reasoning for why one action over alternatives; demonstrate desired output format (location, issue, severity, suggested fix).' },
      { id: '4.3', title: 'Enforce structured output using tool use and JSON schemas',
        targets: 'tool_use with JSON schemas = most reliable for guaranteed schema-compliant output, eliminates JSON syntax errors. tool_choice: "auto" (may return text), "any" (must call SOME tool), forced ({"type":"tool","name":"extract_metadata"}). Strict schemas eliminate SYNTAX errors but NOT semantic errors (line items not summing, wrong fields). Schema design: required vs optional/nullable fields (nullable prevents fabrication), enum + "other"+detail for extensible categories, "unclear" for ambiguity. Confirm tool_choice schema and whether Anthropic offers a strict/structured-output mode.' },
      { id: '4.4', title: 'Implement validation, retry, and feedback loops for extraction quality',
        targets: 'Retry-with-error-feedback: append specific validation errors + original doc + failed extraction on retry for self-correction. Retries ineffective when info is ABSENT from source (vs format/structural errors which retries fix). detected_pattern field to analyze dismissal/false-positive patterns. Semantic validation errors (values do not sum, wrong placement) vs schema syntax errors (eliminated by tool use). calculated_total vs stated_total, conflict_detected booleans. Pydantic validation.' },
      { id: '4.5', title: 'Design efficient batch processing strategies',
        targets: 'Message Batches API: 50% cost savings, up to 24-hour processing window, NO guaranteed latency SLA, custom_id for request/response correlation, does NOT support multi-turn tool calling within a single request. Appropriate for non-blocking latency-tolerant workloads (overnight/weekly), inappropriate for blocking (pre-merge). Resubmit failed docs by custom_id (chunk oversized). Calculate submission frequency vs SLA. Confirm the 50%/24h/custom_id specifics and tool-calling limitation against Anthropic Batches docs.' },
      { id: '4.6', title: 'Design multi-instance and multi-pass review architectures',
        targets: 'Self-review limitation: a model retains generation reasoning, less likely to question its own decisions in the same session. Independent review instances (no prior reasoning context) catch subtle issues better than self-review instructions or extended thinking. Multi-pass: per-file local passes + cross-file integration pass to avoid attention dilution and contradictory findings. Self-reported confidence per finding for calibrated routing.' },
    ],
  },
  {
    num: 5, weight: 15, slug: 'domain-5-context-reliability',
    title: 'Context Management & Reliability',
    scope: 'Keeping long-running and multi-agent systems reliable: preserving critical facts across long contexts, escalation/ambiguity resolution, error propagation, large-codebase context management, human review + confidence calibration, and provenance in multi-source synthesis.',
    tasks: [
      { id: '5.1', title: 'Manage conversation context to preserve critical information across long interactions',
        targets: 'Progressive summarization risk: condensing numbers, percentages, dates, customer-stated expectations into vague summaries. Lost-in-the-middle: models reliably use beginning/end but may omit middle. Tool results accumulate tokens disproportionate to relevance (40+ fields when 5 matter). Pass complete conversation history for coherence. Extract a persistent "case facts" block outside summarized history; trim verbose tool outputs to relevant fields; place key findings at beginning + section headers. Confirm lost-in-the-middle as a documented phenomenon.' },
      { id: '5.2', title: 'Design effective escalation and ambiguity resolution patterns',
        targets: 'Escalation triggers: customer asks for a human, policy exceptions/gaps (not just complex cases), inability to make meaningful progress. Honor explicit human requests immediately vs offer to resolve when straightforward. Sentiment-based escalation and self-reported confidence are UNRELIABLE proxies for complexity. Multiple customer matches -> ask for additional identifiers, not heuristic selection. Add explicit escalation criteria with few-shot examples.' },
      { id: '5.3', title: 'Implement error propagation strategies across multi-agent systems',
        targets: 'Structured error context (failure type, attempted query, partial results, alternative approaches) enables coordinator recovery. Access failures (timeouts needing retry decisions) vs valid empty results (success, no matches). Generic "search unavailable" hides context. Anti-patterns: silently suppressing errors (empty-as-success) and terminating the whole workflow on a single failure. Subagents do local recovery for transient failures, propagate only unresolvable with partial results. Coverage annotations for gaps.' },
      { id: '5.4', title: 'Manage context effectively in large codebase exploration',
        targets: 'Context degradation in extended sessions: inconsistent answers, referencing "typical patterns" instead of specific classes discovered earlier. Scratchpad files persist findings across context boundaries. Subagent delegation isolates verbose exploration while main agent coordinates. Structured state persistence (manifests) for crash recovery: each agent exports state to a known location, coordinator loads manifest on resume. /compact to reduce context usage. Confirm /compact behavior in docs.' },
      { id: '5.5', title: 'Design human review workflows and confidence calibration',
        targets: 'Aggregate accuracy (97% overall) can mask poor performance on specific doc types/fields. Stratified random sampling to measure error rates in high-confidence extractions and detect novel patterns. Field-level confidence scores calibrated with labeled validation sets to route review attention. Validate accuracy by document type and field segment before automating high-confidence extractions. Route low-confidence/ambiguous/contradictory to human review.' },
      { id: '5.6', title: 'Preserve information provenance and handle uncertainty in multi-source synthesis',
        targets: 'Source attribution lost during summarization when claim-source mappings are not preserved. Require structured claim-source mappings (source URLs, doc names, excerpts) preserved/merged through synthesis. Conflicting statistics from credible sources: annotate conflicts with source attribution, do NOT arbitrarily pick one. Temporal data: require publication/collection dates so temporal differences are not misread as contradictions. Render content types appropriately (financial->tables, news->prose, technical->lists).' },
    ],
  },
]

// ---- Schemas ----
const RESEARCH_SCHEMA = {
  type: 'object',
  required: ['taskId', 'taskTitle', 'whatYouNeedToKnow', 'keyFacts', 'antiPatterns', 'selfChecks', 'glossary', 'claimsToVerify'],
  properties: {
    taskId: { type: 'string' },
    taskTitle: { type: 'string' },
    whatYouNeedToKnow: { type: 'string', description: 'Synthesized doc-grounded explanation, 3-6 sentences.' },
    keyFacts: { type: 'array', items: { type: 'object', required: ['fact', 'url'], properties: { fact: { type: 'string' }, url: { type: 'string', description: 'Primary-source URL, or empty string if uncited/flagged.' } } } },
    antiPatterns: { type: 'string', description: 'The wrong-but-tempting approaches the exam contrasts against (these map to distractors).' },
    selfChecks: { type: 'array', items: { type: 'object', required: ['q', 'a'], properties: { q: { type: 'string' }, a: { type: 'string' } } }, description: '2-4 ORIGINAL concept-based questions with brief answers.' },
    glossary: { type: 'array', items: { type: 'object', required: ['term', 'definition', 'url'], properties: { term: { type: 'string' }, definition: { type: 'string' }, url: { type: 'string' } } } },
    claimsToVerify: { type: 'array', items: { type: 'string' }, description: 'Version-specific specifics to adversarially verify: model IDs, token/context limits, parameter names, config file names/syntax, defaults, pricing/limits.' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: { type: 'array', items: {
      type: 'object',
      required: ['claim', 'status', 'correctedFact', 'url', 'note'],
      properties: {
        claim: { type: 'string' },
        status: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
        correctedFact: { type: 'string', description: 'If refuted, the corrected statement; if confirmed, restate the verified fact; if uncertain, the best available statement.' },
        url: { type: 'string', description: 'Primary-source URL backing the verdict, or empty if none found.' },
        note: { type: 'string', description: 'Brief reasoning, and explicitly flag if docs are silent/may have changed since knowledge cutoff.' },
      },
    } },
  },
}

const WRITE_SCHEMA = {
  type: 'object',
  required: ['path', 'oneLineSummary', 'taskCount', 'flaggedCount'],
  properties: {
    path: { type: 'string' },
    oneLineSummary: { type: 'string', description: 'One-line summary of the domain for the INDEX.' },
    taskCount: { type: 'number' },
    flaggedCount: { type: 'number', description: 'Number of facts left flagged as uncertain/unverifiable.' },
  },
}

// ---- Pipeline: each domain = research (per task) -> verify (per task) -> write ----
const SOURCES_HINT = 'Prioritize authoritative primary sources: docs.anthropic.com (Claude API reference, prompt engineering, tool use, MCP, Message Batches), Claude Code docs (CLAUDE.md hierarchy, slash commands, skills, rules, plan mode, --resume, hooks, CLI flags), and the Claude Agent SDK reference (AgentDefinition, agentic loop, subagents/Task, allowedTools, hooks like PostToolUse). You MAY also consult the supplementary third-party study site at https://claudecertificationguide.com/learn (the matching domain page under /learn/N-..., plus /learn/quick-reference and /learn/glossary) to surface candidate topics, decision rules, and exam traps — but treat it as WEAK corroboration only, exactly like a blog/tutorial: it can point you at what to research, but never let a fact rest on it alone; confirm against primary docs before asserting. Actually FETCH and READ top sources via WebFetch/WebSearch — do not synthesize from snippets or memory alone. Cite every nontrivial claim with a PRIMARY-source URL (not the study site). If docs are thin or silent on a point, say so explicitly and do not pad or invent. Note that docs may have changed since the knowledge cutoff.'

const results = await pipeline(
  DOMAINS,
  // Stage 1: research every task statement of the domain in parallel
  (domain) => parallel(domain.tasks.map((task) => () =>
    agent(
      `You are researching study material for the "Claude Certified Architect – Foundations" certification exam.\n\n` +
      `Domain ${domain.num}: ${domain.title} (${domain.weight}% of scored content).\n` +
      `Task Statement ${task.id}: "${task.title}".\n\n` +
      `Research targets (the PDF's exact Knowledge-of / Skills-in bullets, paraphrased):\n${task.targets}\n\n` +
      `Produce grounded study content for THIS task statement only:\n` +
      `- whatYouNeedToKnow: a synthesized, doc-grounded explanation of the knowledge/skills.\n` +
      `- keyFacts: specific, verified facts, each with a primary-source URL.\n` +
      `- antiPatterns: the wrong-but-tempting approaches the exam contrasts against (these become distractors).\n` +
      `- selfChecks: 2-4 ORIGINAL concept-based Q&A. Do NOT copy any exam sample question.\n` +
      `- glossary: this task's key terms with one-line definitions + URLs.\n` +
      `- claimsToVerify: list every version-specific specific you assert (model IDs, token/context limits, parameter names like tool_choice/stop_reason values, config file names/syntax like .mcp.json/.claude/rules paths, CLI flags, defaults, the Batches 50%/24h numbers) so a verifier can adversarially confirm them.\n\n` +
      SOURCES_HINT,
      { label: `research:${task.id}`, phase: 'Research', schema: RESEARCH_SCHEMA }
    )
  )),
  // Stage 2: adversarially verify each task's flagged claims; return BOTH research + verdicts
  async (researchArr, domain) => {
    const verdictsArr = await parallel(researchArr.map((res, i) => () => {
      if (!res || !res.claimsToVerify || res.claimsToVerify.length === 0) {
        return Promise.resolve({ verdicts: [] })
      }
      const task = domain.tasks[i]
      return agent(
        `You are an adversarial fact-checker for Claude certification study material. Verify EACH claim below against PRIMARY Anthropic documentation (docs.anthropic.com, Claude Code docs, Claude Agent SDK reference). Model IDs, context-window/token limits, parameter names, config file names and syntax, defaults, and pricing/limits are the exam's favorite distractor traps — confirm each against primary docs before accepting it.\n\n` +
        `Context — Domain ${domain.num}, Task ${task.id}: "${task.title}".\n\n` +
        `Claims to verify:\n${res.claimsToVerify.map((c, n) => `${n + 1}. ${c}`).join('\n')}\n\n` +
        `For each claim: FETCH and READ the relevant primary doc. Mark status confirmed/refuted/uncertain, give the corrected/verified fact, cite the primary-source URL, and note your reasoning. If two sources disagree or the docs are silent, mark uncertain and say so — do NOT guess. Flag anything that may have changed since the knowledge cutoff.`,
        { label: `verify:${task.id}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      )
    }))
    return { research: researchArr, verdicts: verdictsArr }
  },
  // Stage 3: writer assembles the domain doc from research + verdicts and writes it to disk
  (payload, domain) => {
    const research = (payload && payload.research) || []
    const verdicts = (payload && payload.verdicts) || []
    const bundle = research.map((res, i) => ({ research: res, verdicts: (verdicts[i] && verdicts[i].verdicts) || [] }))
    const filePath = `${OUT}/${domain.slug}.md`
    return agent(
      `You are writing ONE self-contained, cited study document for the "Claude Certified Architect – Foundations" exam, for Domain ${domain.num}: ${domain.title} (${domain.weight}% of scored content).\n\n` +
      `Write the file to: ${filePath} using the Write tool.\n\n` +
      `Use EXACTLY this Markdown structure, optimized for HUMAN READABILITY (scannable bullets, short paragraphs, generous blank lines — never run-on paragraphs):\n` +
      '```\n' +
      `# Domain ${domain.num}: ${domain.title} (${domain.weight}% of scored content)\n\n` +
      `> Generated ${GEN_DATE} from the Claude Certified Architect – Foundations exam guide.\n` +
      `> Study material — grounded in cited primary docs, not an answer key.\n\n` +
      `## Scope & exam weight\n<2-3 SHORT sentences, each on its own line / short paragraph>\n\n` +
      `## Task statements\n\n` +
      `### Task N.M: <verbatim task-statement title>\n\n` +
      `**What you need to know**\n\n<2-4 SHORT paragraphs (1-3 sentences each) split at topic boundaries, blank line between them; use a numbered list where the content describes a sequence/cycle/steps>\n\n` +
      `**Key facts**\n\n- <one fact per bullet> [source](url)\n- ...\n\n` +
      `**Anti-patterns the exam tests**\n\n✅ **Right:** <the correct pattern>\n\n- ❌ <one tempting-but-wrong approach per bullet, no run-ons>\n- ❌ ...\n\n` +
      `**Self-check (original, concept-based)**\n\n- **Q:** <question>\n  **A:** <brief answer>\n\n` +
      `(repeat for every task statement)\n\n` +
      `## Concept glossary (this domain's appendix slice)\n\n- **<term>** — <one-line def> [source](url)\n\n` +
      `## Sources\n\n- <deduplicated list of every cited URL>\n` +
      '```\n\n' +
      `Scope sentence to use as a basis: ${domain.scope}\n\n` +
      `Here is the researched + adversarially-verified content for each task statement, as JSON. ` +
      `CRITICAL: where a verdict has status "refuted", use the correctedFact and DROP the wrong claim. ` +
      `Where status is "uncertain", either omit the specific or include it with an explicit hedge like "(per docs as of ${GEN_DATE}; reconfirm — may have changed)". ` +
      `Only present confirmed/corrected facts as settled. Preserve every source URL. Keep the verbatim task-statement titles. Keep Anti-patterns sharp (right pattern vs plausible-wrong), rendered as the ✅ Right line + one ❌ bullet per wrong approach. Favor short scannable bullets over dense prose. Do not copy any exam sample question.\n\n` +
      `JSON:\n` + JSON.stringify({ domain: { num: domain.num, title: domain.title, weight: domain.weight }, tasks: bundle }, null, 1) + `\n\n` +
      `After writing the file, return the path, a one-line summary of the domain for the index, the task count, and how many facts you left flagged as uncertain/unverifiable.`,
      { label: `write:domain-${domain.num}`, phase: 'Write', schema: WRITE_SCHEMA }
    )
  }
)

return { domains: results.filter(Boolean) }
