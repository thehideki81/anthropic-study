# Domain 3: Claude Code Configuration & Workflows (20% of scored content)

> Generated 2026-06-14; refreshed 2026-10-16 against live docs.
> Study material — grounded in cited primary docs, not an answer key.

## Scope & exam weight

This domain (20% of scored content) covers configuring Claude Code for teams and workflows.

Topics include: the CLAUDE.md memory hierarchy and `@import` syntax, `.claude/rules/` path scoping, custom slash commands and Agent Skills (including `context: fork`, `allowed-tools`, and `argument-hint`), plan mode versus direct execution, iterative refinement techniques, and CI/CD integration via headless mode (`-p`, `--output-format json`, `--json-schema`).

The recurring theme is which mechanism is *context* (advisory, e.g. CLAUDE.md and rules) versus which actually *enforces* or *defers* behavior (hooks, permission rules/managed settings, permission modes), and which mechanism *defers loading* (path-scoped rules, skills).

> Note: Claude Code docs migrated from `docs.anthropic.com/en/docs/claude-code/*` to `code.claude.com/docs/en/*` (301 redirects), and API/prompt-engineering docs now live at `platform.claude.com` (the old per-technique prompt-engineering pages such as `multishot-prompting` now redirect into one `claude-prompting-best-practices` page).
>
> Refresh note (2026-10-16): Claude Code moved from ~v2.1.176 (June 12, 2026) to v2.1.301 (October 15, 2026). The biggest exam-relevant shifts: the `default` permission mode is now labelled **Manual**, **auto mode is the built-in starting mode** for interactive sessions (v2.1.283+), **Explore no longer runs on Haiku**, a skill's frontmatter **`name` now sets its slash-command name**, Claude Code **reads `AGENTS.md` natively** when no CLAUDE.md exists (v2.1.277+), and user-level vs project rules are **no longer described as "project wins"**.

## Task statements

### Task 3.1: Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization

**What you need to know**

CLAUDE.md files are plain-markdown instruction files Claude Code loads at the start of every session as a user message (after the system prompt, not part of it), so they shape behavior but are not hard enforcement — for guaranteed enforcement use hooks or managed settings (`permissions.deny`).

They live at four scopes loaded broadest-to-most-specific: managed policy (org-wide, OS-specific path, or the `claudeMd` key in managed settings), user-level (`~/.claude/CLAUDE.md`, personal, NOT version-controlled), project-level (`./CLAUDE.md` or `./.claude/CLAUDE.md`, team-shared via source control), and local (`./CLAUDE.local.md`, gitignored — still a current, documented scope).

Claude walks UP the directory tree from cwd loading every CLAUDE.md/CLAUDE.local.md in full at launch, ordered filesystem-root-down to cwd (most specific read last); subdirectory files below cwd load on demand only when Claude reads, writes, or edits a file there.

For modularity use `@path/to/import` syntax or, preferably for large projects, split topic files into `.claude/rules/`. If a repo only has `AGENTS.md`, current Claude Code (v2.1.277+) reads it in place of CLAUDE.md.

**Key facts**

- CLAUDE.md exists at four scopes loaded broadest-to-most-specific: Managed policy, User (`~/.claude/CLAUDE.md`), Project (`./CLAUDE.md` or `./.claude/CLAUDE.md`), and Local (`./CLAUDE.local.md`). All discovered files are concatenated, not overridden. [source](https://code.claude.com/docs/en/memory)
- User instructions at `~/.claude/CLAUDE.md` are shared with "Only you (all projects)" — personal and not committed to source control. [source](https://code.claude.com/docs/en/memory)
- A project CLAUDE.md can be stored in EITHER `./CLAUDE.md` OR `./.claude/CLAUDE.md`, shared with team members via source control. [source](https://code.claude.com/docs/en/memory)
- `CLAUDE.local.md` is for personal project-specific preferences and should be in `.gitignore`; within a directory it is appended after CLAUDE.md (read last at that level). Because it is gitignored, it exists only in the git worktree where you created it — to share personal instructions across worktrees, import a file from your home directory (e.g. `@~/.claude/my-project-instructions.md`). [source](https://code.claude.com/docs/en/memory)
- Managed policy CLAUDE.md paths: macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux/WSL `/etc/claude-code/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md`. Cannot be excluded by individual settings. [source](https://code.claude.com/docs/en/memory)
- NEW: Managed CLAUDE.md content can instead be placed inline via the `claudeMd` key in `managed-settings.json`; same precedence as a managed file (loads before user and project), honored only in managed/policy settings (no effect in user, project, or local settings). [source](https://code.claude.com/docs/en/memory)
- Use managed settings for technical enforcement (`permissions.deny`, `sandbox.enabled`, `env`, `forceLoginMethod`) and managed CLAUDE.md for behavioral guidance (code style, compliance reminders). [source](https://code.claude.com/docs/en/memory)
- Imports use `@path/to/import` syntax; relative paths resolve against the importing file (not cwd); absolute paths allowed; recursive imports allowed up to a maximum depth of four hops. Paths with spaces need backslash-escaping (`@Design\ Docs/api.md`); quoted paths are not imported; `@` inside code spans/fenced blocks is not treated as an import. [source](https://code.claude.com/docs/en/memory)
- The first time a project-level memory file imports a file outside the working directory (an "external import"), Claude Code shows a one-time approval dialog; user-scope files (`~/.claude/CLAUDE.md`, `~/.claude/rules/`) load their imports without the dialog. [source](https://code.claude.com/docs/en/memory)
- Imported files load at launch and still enter the context window — `@imports` help organization but do NOT reduce context consumption. [source](https://code.claude.com/docs/en/memory)
- Ancestor CLAUDE.md/CLAUDE.local.md files load in full at launch, ordered root-down to cwd; subdirectory files BELOW cwd load on demand once Claude reads, writes, or edits another file in that subdirectory (including a single-file Bash read like `cat`/`head`). Write/Edit triggering was added in v2.1.288 and Bash-read triggering fixed in v2.1.293. [source](https://code.claude.com/docs/en/memory) / [changelog](https://code.claude.com/docs/en/changelog)
- Block-level HTML comments (`<!-- ... -->`) in CLAUDE.md are stripped before injection into context (comments inside code blocks are preserved) — a way to leave maintainer notes without spending tokens. [source](https://code.claude.com/docs/en/memory)
- `.claude/rules/` holds modular topic markdown files; all `.md` files are discovered recursively. Rules without `paths` frontmatter load at launch with the same priority as `.claude/CLAUDE.md`. [source](https://code.claude.com/docs/en/memory)
- CHANGED: User-level rules in `~/.claude/rules/` apply to every project and load BEFORE project rules, so a project rule appears later in context — but the docs now state "Neither set overrides the other: if a user rule and a project rule conflict, Claude may follow either one, so keep the two consistent." [source](https://code.claude.com/docs/en/memory)
- CHANGED: `/memory` lists your CLAUDE.md, CLAUDE.local.md, and other memory file locations across user and project scopes (including entries for files that don't exist yet, which it creates when selected), toggles auto memory, and opens the auto-memory folder. To check which CLAUDE.md and rules files actually **loaded at launch**, the docs now point to `/context` (the **Memory files** list). [source](https://code.claude.com/docs/en/memory)
- `/init` generates a starting CLAUDE.md from codebase analysis; if one exists it suggests improvements rather than overwriting. `CLAUDE_CODE_NEW_INIT=1` enables an interactive multi-phase flow that asks which artifacts to set up (CLAUDE.md files, skills, hooks), explores with a subagent, and presents a reviewable proposal before writing. `/init` also migrates Cursor/Copilot rule files. [source](https://code.claude.com/docs/en/memory)
- CLAUDE.md content is delivered as a user message AFTER the system prompt; it is context, not enforced configuration. For hard enforcement use a PreToolUse hook or managed settings. For system-prompt-level instructions in scripts use `--append-system-prompt`. [source](https://code.claude.com/docs/en/memory)
- Recommended size target: under 200 lines per CLAUDE.md file; longer files consume more context and reduce adherence. A CLAUDE.md up to 4 MiB loads in full; a larger file is skipped. Claude Code warns at startup and in `/status` when a file is over the recommended length. [source](https://code.claude.com/docs/en/memory)
- CHANGED: Claude Code now reads `AGENTS.md` directly (v2.1.277+): by default it reads `AGENTS.md` only when there is no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` in cwd or above (user/managed CLAUDE.md and `.claude/rules/` don't count). The `/config` → **Project instructions** setting chooses `claude-md-or-agents-md` (default), `claude-md-and-agents-md`, `claude-md`, or `managed-only`. Importing (`@AGENTS.md`) or symlinking still works; on Windows prefer the import. [source](https://code.claude.com/docs/en/memory)
- `claudeMdExcludes` (glob/path patterns matched against absolute paths) skips ancestor CLAUDE.md/rules files in monorepos; configurable at any settings layer and arrays merge across layers; managed-policy CLAUDE.md cannot be excluded. [source](https://code.claude.com/docs/en/memory)
- After `/compact`, the project-root CLAUDE.md is re-read from disk and re-injected; nested CLAUDE.md files and path-scoped rules reload on demand. Instructions given only in conversation are what get lost. [source](https://code.claude.com/docs/en/memory)
- NEW: `/doctor prompt-audit` (v2.1.283+) audits CLAUDE.md, CLAUDE.local.md, AGENTS.md, rules, skills, commands, subagents, and output styles for outdated/conflicting instructions and proposes edits without applying them. [source](https://code.claude.com/docs/en/memory)
- Auto memory (Claude-written) lives at `~/.claude/projects/<project>/memory/` with `MEMORY.md` as index; first 200 lines or 25KB of MEMORY.md loads each session (topic files are read on demand). It is per git repo (shared across worktrees), machine-local, on by default, toggled via `/memory` or `autoMemoryEnabled`. Requires Claude Code v2.1.59+ (reconfirm — not re-verified 2026-10-16; the live page no longer states a minimum version). [source](https://code.claude.com/docs/en/memory)

**Anti-patterns the exam tests**

✅ **Right:** Put team-shared instructions in project-level `./CLAUDE.md` or `./.claude/CLAUDE.md`; treat all discovered files as concatenated (more specific read last, not "overriding"); split topic files into `.claude/rules/`; and enforce hard rules with a PreToolUse hook or managed settings (`permissions.deny`), not CLAUDE.md.

- ❌ Committing `~/.claude/CLAUDE.md` (user-level) to share team standards — user-level memory is personal/per-machine; team-shared instructions belong in project-level `./CLAUDE.md` or `./.claude/CLAUDE.md`.
- ❌ Believing higher-hierarchy CLAUDE.md "overrides" lower files — all discovered files are concatenated, more specific is simply read last.
- ❌ Assuming `@imports` reduce context — they load at launch and consume the same tokens; only path-scoped rules and skills defer loading.
- ❌ Thinking nested subdirectory CLAUDE.md files load at launch — they load on demand when Claude reads/writes/edits a file there.
- ❌ Putting `CLAUDE.local.md` in source control instead of `.gitignore`.
- ❌ Stating max import depth is 5 hops — it is four.
- ❌ Using CLAUDE.md to "block"/"enforce" an action — it is non-binding; enforcement requires a PreToolUse hook or managed settings (`permissions.deny`).
- ❌ Cramming everything into one monolithic 500-line CLAUDE.md instead of splitting into `.claude/rules/`.
- ❌ Assuming Claude Code ignores `AGENTS.md` — since v2.1.277 it reads `AGENTS.md` when no CLAUDE.md/CLAUDE.local.md exists; but if a CLAUDE.md exists, AGENTS.md is NOT read by default (import it or change **Project instructions**).

**Self-check (original, concept-based)**

- **Q:** A team wants all developers to share the same build commands and coding standards for a repo — which CLAUDE.md location is correct, which is a mistake?
  **A:** Correct: project-level `./CLAUDE.md` or `./.claude/CLAUDE.md`, committed to source control. Mistake: `~/.claude/CLAUDE.md` (user-level), which is personal/per-machine and not shared via VCS.
- **Q:** You add `@docs/style-guide.md` and `@docs/testing.md` imports hoping to shrink startup context — does it work?
  **A:** No. Imports load at launch and enter the context window. To defer loading, use path-scoped rules in `.claude/rules/` (or skills), which load only when relevant files are touched / the skill is invoked.
- **Q:** How do you verify which instruction files Claude actually loaded at launch, and where is precedence within a single directory?
  **A:** Run `/context` and check **Memory files** (current docs); `/memory` lists memory file locations and opens them for editing. Within one directory, CLAUDE.local.md is appended after CLAUDE.md; across the tree, files are ordered root-down to cwd so the most specific is read last.
- **Q:** Difference in loading between a `.claude/rules/` file with no frontmatter versus one with a `paths` glob?
  **A:** No frontmatter: loaded unconditionally at launch with the same priority as `.claude/CLAUDE.md`. With `paths` glob: loaded conditionally, only when Claude reads/writes/edits files matching the pattern.
- **Q:** A repo has both `AGENTS.md` (for other agents) and a `CLAUDE.md` that doesn't mention it. A developer expects Claude to follow `AGENTS.md`. What happens and what's the fix?
  **A:** By default Claude reads only the CLAUDE.md files because a CLAUDE.md exists. Fix: add `@AGENTS.md` to the CLAUDE.md, or set **Project instructions** to `claude-md-and-agents-md`.

### Task 3.2: Create and configure custom slash commands and skills

**What you need to know**

Custom slash commands and Agent Skills have been unified: a markdown file at `.claude/commands/<name>.md` and a skill at `.claude/skills/<name>/SKILL.md` both create `/name` and work the same way; legacy `.claude/commands/` files keep working and accept the same frontmatter (except `name` and `paths`), but skills are recommended (supporting-file directory, invocation control, automatic model-driven loading).

Scope is by location: project-level `.claude/skills/` (committed/team-shared) versus personal `~/.claude/skills/` (your projects), plus nested `<subdir>/.claude/skills/`, `--add-dir` directories, enterprise/managed, plugin, and claude.ai-synced skills. On name collisions enterprise overrides personal overrides project, and a skill takes precedence over a same-named command.

The key exam contrast: skill descriptions are always in context (unless `disable-model-invocation: true`) but the full body loads only on invocation, whereas CLAUDE.md loads in full every session — so procedures and long reference go in skills, always-true facts in CLAUDE.md.

**Key facts**

- Personal skills: `~/.claude/skills/<skill-name>/SKILL.md` (all your projects). Project: `.claude/skills/<skill-name>/SKILL.md` (this repo). Nested: `<subdir>/.claude/skills/<name>/SKILL.md` (sessions in or below that subdir). Plugin: `<plugin>/skills/<skill-name>/SKILL.md` (as `/plugin-name:skill-name`). Enterprise: managed settings directory `.claude/skills/`. claude.ai account skills sync to `~/.claude/skills/synced/`. [source](https://code.claude.com/docs/en/skills)
- Every skill is a directory whose required entrypoint is `SKILL.md` (YAML frontmatter between `---` markers plus markdown); only `description` is recommended, all fields optional; unknown fields are silently ignored. [source](https://code.claude.com/docs/en/skills)
- Frontmatter fields (current): `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`, `hooks`, `paths`, `shell`, plus spec fields `metadata`/`license`/`compatibility`. Booleans accept `true/false`, `yes/no`, `on/off`, `1/0` (v2.1.218+). [source](https://code.claude.com/docs/en/skills)
- `context: fork` runs the skill in a new subagent (type from `agent`) with an isolated context window that has no access to main conversation history; the SKILL.md content becomes the subagent's prompt. Despite the name it does NOT fork the current conversation. [source](https://code.claude.com/docs/en/skills)
- NEW: Since v2.1.218 a `context: fork` skill runs in the **background by default** (you keep working; its result arrives when done); set `background: false` to wait for the result in the invoking turn. [source](https://code.claude.com/docs/en/skills)
- The `agent` field selects which subagent type runs when `context: fork` is set (e.g. `Explore`, `Plan`, `general-purpose`, or a custom `.claude/agents/` subagent); if omitted, defaults to `general-purpose`. [source](https://code.claude.com/docs/en/skills)
- `allowed-tools` (hyphenated) pre-approves listed tools during the turn that invokes the skill so Claude does not prompt; the grant clears when you send your next message. It does NOT restrict — every tool remains callable and normal permission settings still govern unlisted tools. Counterpart `disallowed-tools` removes tools from the pool while active (also clears on next message). [source](https://code.claude.com/docs/en/skills)
- `argument-hint` (hyphenated) is an optional autocomplete hint for expected arguments, e.g. `[issue-number]` or `[filename] [format]`. [source](https://code.claude.com/docs/en/skills)
- `disable-model-invocation: true` prevents Claude from auto-loading a skill — its description is removed from Claude's context, and you can still type `/name`. `user-invocable: false` hides it from the `/` menu and Claude Code doesn't run it when you type `/name`, so only Claude can invoke it. Defaults: `disable-model-invocation` false, `user-invocable` true. [source](https://code.claude.com/docs/en/skills)
- `model` overrides the model for the rest of the current turn only (not saved; accepts `inherit`); `hooks` registers hooks when the skill is invoked that keep running for the rest of the session; `paths` (glob list or comma-separated string, same format as path-specific rules) limits automatic activation to when Claude works with matching files. [source](https://code.claude.com/docs/en/skills)
- Custom commands are merged into skills: `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`; on a name collision the skill takes precedence. Command files in subdirectories become colon-separated (`.claude/commands/frontend/component.md` → `/frontend:component`). [source](https://code.claude.com/docs/en/skills)
- On name collisions across levels: enterprise overrides personal, and personal overrides project; plugin skills use a `plugin-name:skill-name` namespace and cannot conflict. A user skill replaces a bundled skill/built-in command of the same name (not its aliases). [source](https://code.claude.com/docs/en/skills)
- Skill descriptions are always loaded into context so Claude knows what is available, but full skill content loads only when invoked (manually or by Claude) — the core difference from always-loaded CLAUDE.md. [source](https://code.claude.com/docs/en/skills)
- CLAUDE.md files load in full at session start as persistent memory; skills load on demand. Use CLAUDE.md for always-true facts/standards, a skill for multi-step procedures or large reference. [source](https://code.claude.com/docs/en/memory)
- CHANGED: In a personal or project skill directory, the frontmatter `name` now **sets the slash command** shown in the `/` menu and that you type (unless another command already uses it); the directory name also invokes the skill. Default when `name` is omitted: the directory name (`.claude/skills/deploy-staging/SKILL.md` → `/deploy-staging`, or `/deploy` with `name: deploy`). [source](https://code.claude.com/docs/en/skills)
- Argument substitutions: `$ARGUMENTS` (all; appended as `ARGUMENTS: <value>` if no placeholder), `$ARGUMENTS[N]` / `$N` (0-based positional, `$0` = first), `$name` (named args from `arguments` frontmatter), plus `${CLAUDE_SKILL_DIR}`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_PROJECT_DIR}`. [source](https://code.claude.com/docs/en/skills)
- Dynamic context injection: `` !`git diff HEAD` `` runs the shell command before Claude sees the content and inlines output; recognized only when `!` starts a line or follows whitespace. Multi-line uses a fenced ` ```! ` block. A non-zero exit aborts the whole invocation (append `|| true` to tolerate); `"disableSkillShellExecution": true` replaces these commands with a policy notice. [source](https://code.claude.com/docs/en/skills)
- Skills follow the open Agent Skills standard (agentskills.io); Claude Code extends it with invocation control, subagent execution, and dynamic context injection. Outside Claude Code (claude.ai uploads, Skills API) only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` are allowed — other keys are a hard validation error. [source](https://code.claude.com/docs/en/skills)
- CHANGED: The combined `description` + `when_to_use` text is truncated at 1,536 characters per skill in the skill listing; the cap is configurable via `skillListingMaxDescChars` (default 1536) — not `maxSkillDescriptionChars`. The whole listing budget is ~1% of the context window (`skillListingBudgetFraction`); on overflow, descriptions of least-invoked skills are dropped first. Put the key use case first. [source](https://code.claude.com/docs/en/skills) / [settings](https://code.claude.com/docs/en/settings-reference)
- After compaction, Claude Code re-attaches the most recent invocation of each skill, keeping the first 5,000 tokens of each within a combined 25,000-token budget (filled from the most recently invoked skill). [source](https://code.claude.com/docs/en/skills)

**Anti-patterns the exam tests**

✅ **Right:** Treat `allowed-tools` as pre-approval only (deny rules still govern); put long procedures/large reference in a skill (loads on demand) and always-true facts in CLAUDE.md; set `context: fork` explicitly when you need isolation; share project skills by committing `.claude/skills/`; know that frontmatter `name` (or, absent it, the directory/file name) sets the slash-command name; and treat commands and skills as one merged system sharing frontmatter.

- ❌ Believing `allowed-tools` restricts/sandboxes which tools a skill can use — it only pre-approves to skip prompts (for the invoking turn); every tool stays callable and deny rules still govern.
- ❌ Putting long procedures/large reference docs into CLAUDE.md because they should "always be available" — CLAUDE.md loads in full every session and costs tokens continuously; a skill loads on demand.
- ❌ Assuming `context: fork` is the default — by default skills run inline in the main conversation; `fork` must be set explicitly.
- ❌ Assuming `context: fork` copies the current conversation into the subagent — the forked skill starts with no conversation history, so its instructions must stand alone.
- ❌ Thinking project skills auto-sync between machines — sharing happens by committing `.claude/skills/`; `~/.claude/skills/` is personal/local.
- ❌ Claiming the frontmatter `name` is "display only" — in current Claude Code it sets the command you type (the directory name also still works).
- ❌ Assuming commands and skills are separate systems with different formats — they are merged and share frontmatter.
- ❌ Confusing `user-invocable: false` (hides from `/` menu; only Claude can invoke) with `disable-model-invocation: true` (blocks Claude and removes the description from context; you can still type `/name`).

**Self-check (original, concept-based)**

- **Q:** You want a `/deploy` workflow Claude must never trigger on its own but you can run manually, in a clean context that cannot see the chat — which frontmatter?
  **A:** `disable-model-invocation: true` (only you can invoke) plus `context: fork` (isolated subagent context without conversation history). Add `background: false` if you want to wait for the result in the same turn.
- **Q:** A teammate edits `~/.claude/skills/lint/SKILL.md` and expects the team to get it after `git pull` — why doesn't that work, and the fix?
  **A:** `~/.claude/skills/` is personal/user-scoped, not in the repo. Move the skill to project-scoped `.claude/skills/lint/SKILL.md` and commit it.
- **Q:** When does a skill's body load versus its description, contrasted with CLAUDE.md?
  **A:** The description is always in context (unless `disable-model-invocation: true`); the full SKILL.md body loads only when invoked (by you or Claude). CLAUDE.md loads in full at the start of every session.
- **Q:** You set `allowed-tools: Bash(git commit *)` expecting the skill to be blocked from anything else — correct?
  **A:** No. `allowed-tools` only pre-approves the listed tools for the invoking turn; it does not restrict. Use `disallowed-tools` to remove tools, or deny rules in permission settings to block globally.
- **Q:** A skill lives at `.claude/skills/release-notes-generator/SKILL.md` with `name: notes`. What can users type?
  **A:** `/notes` (frontmatter `name` sets the command, unless another command already uses it); the directory name `/release-notes-generator` also invokes it.

### Task 3.3: Apply path-specific rules for conditional convention loading

**What you need to know**

Split project instructions out of a monolithic CLAUDE.md into modular markdown files under `.claude/rules/`. Any rule file can carry YAML frontmatter with a `paths` field of glob patterns; such a path-scoped rule loads into context only when Claude works with matching files, saving context.

Rules WITHOUT a `paths` field load unconditionally at launch with the same priority as `.claude/CLAUDE.md`.

Path-scoped rules in a central `.claude/rules/` directory beat directory-level/nested CLAUDE.md when the same convention applies to many scattered paths (a glob like `**/*.test.tsx` matches across directories from one file, whereas a nested CLAUDE.md covers only its own subtree).

All of these (CLAUDE.md, rules, auto memory) are context, not enforced — to hard-block use a PreToolUse hook or permission deny rules. Verify loaded files with `/context` (and `/memory` to open/edit); debug load timing with the `InstructionsLoaded` hook.

**Key facts**

- Path-specific rules use YAML frontmatter with a `paths` field of glob patterns, e.g. `paths:` then `- "src/api/**/*.ts"`. The rule applies only when Claude works with matching files. `paths` accepts a YAML list **or a comma-separated string**; it is the only field Claude Code reads from a rule (others are ignored), and the frontmatter is stripped before loading. [source](https://code.claude.com/docs/en/memory)
- If a rule's YAML frontmatter doesn't parse, Claude Code ignores the frontmatter and loads the rule as if it had no `paths` (i.e. unconditionally); `claude --debug` shows the parse error. [source](https://code.claude.com/docs/en/memory)
- Rules live in `.claude/rules/`; all `.md` files are discovered recursively, so rules can be organized into subdirectories (e.g. `frontend/`, `backend/`). [source](https://code.claude.com/docs/en/memory)
- Rules WITHOUT a `paths` field load unconditionally at launch with the same priority as `.claude/CLAUDE.md`. A path-scoped rule loads when Claude uses Read, Write, or Edit on a matching file, or views it with a single-file Bash read (`cat`, `head`, …) — not on every tool use. (Write/Edit triggering: v2.1.288; Bash-read fix: v2.1.293.) [source](https://code.claude.com/docs/en/memory) / [changelog](https://code.claude.com/docs/en/changelog)
- Documented glob semantics: `**/*.ts` = all TS files in any directory; `src/**/*` = all files under src/; `*.md` = markdown in project root; `src/components/*.tsx` = one directory. Brace expansion like `src/**/*.{ts,tsx}` is supported (a rule's `paths` share a budget of 1,000 expanded patterns / 4 MiB; over-budget patterns match nothing). Escape a literal `[` as `\[`. [source](https://code.claude.com/docs/en/memory)
- CHANGED: User-level rules in `~/.claude/rules/` apply to every project and load BEFORE project rules (so project rules appear later in context), but neither set overrides the other — on conflict Claude may follow either, so keep them consistent. [source](https://code.claude.com/docs/en/memory)
- `.claude/rules/` supports symlinks for sharing rules across projects; circular symlinks are detected/handled. A symlink whose target is outside the working directory is treated like an external import: it loads only after you approve external imports for the project, and then only the rules WITHOUT `paths`. Network-path symlink targets are not followed. [source](https://code.claude.com/docs/en/memory)
- Decision rule: use a central path-scoped rule when conventions belong in one place or the same rule applies to many scattered paths; use a per-directory CLAUDE.md when directory owners maintain their own conventions versioned alongside that code. [source](https://code.claude.com/docs/en/large-codebases)
- A per-directory CLAUDE.md loads at launch (if started from that directory) or on demand; a path-scoped rule loads when Claude works with a file matching its `paths:` glob. For very large orgs, conventions can be centralized in an internal-marketplace plugin. [source](https://code.claude.com/docs/en/large-codebases)
- Rules and CLAUDE.md are context, not enforced configuration; to block an action regardless of Claude's decision use a PreToolUse hook instead. [source](https://code.claude.com/docs/en/memory)
- `/context` (Memory files) shows the CLAUDE.md and rules files that loaded at launch; on-demand files print a `Loaded` line when they load; `/memory` lists/open memory files for editing. [source](https://code.claude.com/docs/en/memory)
- The `InstructionsLoaded` hook can log exactly which instruction files load, when, and why — useful for debugging path-specific rules and lazy-loaded files. [source](https://code.claude.com/docs/en/memory)
- `@path` imports help organization but do NOT reduce context (imported files load at launch); max import depth is four hops. [source](https://code.claude.com/docs/en/memory)
- `claudeMdExcludes` (glob patterns matched against absolute paths) can exclude CLAUDE.md AND rules files from parent/other-team dirs, e.g. `"/home/user/monorepo/other-team/.claude/rules/**"`. For symlinked rules, a pattern matching either the link path or its target excludes the file (v2.1.239+). [source](https://code.claude.com/docs/en/memory)
- Loading memory from a directory added via `--add-dir` requires env var `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`; with it, `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`, and `CLAUDE.local.md` load from that directory; without it they are not loaded. [source](https://code.claude.com/docs/en/memory)
- Project rules are skipped if you exclude `project` from `--setting-sources` (since v2.1.211 this also covers on-demand/path-scoped rules). [source](https://code.claude.com/docs/en/memory)

**Anti-patterns the exam tests**

✅ **Right:** Move file-type-specific guidance into path-scoped `.claude/rules/` so it loads only when matching files are touched; use a single central glob rule (e.g. `**/*.test.tsx`) for conventions spanning scattered directories; keep user-level and project rules consistent (neither overrides the other); use a PreToolUse hook or permission deny rule to actually block; and write valid YAML under `paths:` (a list of quoted patterns is the documented, safest form).

- ❌ Putting every convention into one giant root CLAUDE.md so it is always in context (wastes tokens, reduces adherence) instead of moving file-type-specific guidance into path-scoped `.claude/rules/`.
- ❌ Believing a path-scoped rule HARD-ENFORCES behavior — rules are context only; use a PreToolUse hook or permission deny rule to actually block.
- ❌ Using a nested/per-directory CLAUDE.md for a convention spanning many scattered directories when a single glob like `**/*.test.tsx` covers them all.
- ❌ Assuming a user-level rule and a project rule have a guaranteed winner on conflict — current docs say neither overrides; Claude may follow either, so resolve the conflict.
- ❌ Expecting `@path` imports to save context.
- ❌ Confusing path-scoped rules with skills — skills load when invoked/judged relevant, rules load every session or when matching files are opened.
- ❌ Writing malformed YAML frontmatter — the rule silently falls back to loading unconditionally (losing its scoping).

**Self-check (original, concept-based)**

- **Q:** Lint conventions should apply to every `.test.tsx` file regardless of package — why is a path-scoped rule with `paths: ["**/*.test.tsx"]` better than per-package nested CLAUDE.md?
  **A:** One central rule with a recursive glob matches across all directories from a single file and loads only when a matching test file is read/written/edited; nested CLAUDE.md would require duplication per package and covers only its own directory.
- **Q:** A teammate insists `.claude/rules/security.md` will guarantee Claude never reads secret files — what's wrong, and what should they use?
  **A:** Rules are context, not enforced; Claude may not strictly comply. To hard-block reads, use a PreToolUse hook or a `permissions.deny` Read rule.
- **Q:** Difference between a rule file with no `paths` frontmatter and one with it?
  **A:** No `paths` = loaded unconditionally at launch with the same priority as `.claude/CLAUDE.md`. With `paths` globs = loaded only when Claude works with matching files, saving context.
- **Q:** `~/.claude/rules/style.md` says "use tabs" and the project's `.claude/rules/style.md` says "use spaces". Which wins?
  **A:** Neither is guaranteed. User rules load first so the project rule appears later in context, but the docs say neither overrides the other and Claude may follow either — remove the conflict (e.g. delete or narrow the personal rule).
- **Q:** A rule's frontmatter has a YAML typo. What happens?
  **A:** Claude Code ignores the frontmatter and loads the rule as if it had no `paths` — unconditionally at launch. Check `claude --debug` for the parse error.

### Task 3.4: Determine when to use plan mode vs direct execution

**What you need to know**

Plan mode is a Claude Code permission mode: Claude reads files and runs exploratory shell commands to research, then proposes a plan, but makes no source edits until you approve.

Anthropic's recommended workflow is four phases:

1. Explore (plan mode, read files, no changes)
2. Plan (ask for a detailed implementation plan)
3. Implement (switch out of plan mode, code while verifying against the plan)
4. Commit

Use plan mode when the approach is uncertain, the change touches multiple files, there are multiple valid approaches/architectural decisions, or you are unfamiliar with the code; "if you could describe the diff in one sentence, skip the plan."

The Explore subagent is a fast, read-only built-in agent that keeps verbose discovery output in its own context window and returns only a summary — how you combine research with direct execution without flooding main context. (Since v2.1.198 it inherits the main session's model rather than running on Haiku.)

Permission-mode landscape (current): `default` (labelled **Manual** in the UI since v2.1.200; `manual` accepted as an alias), `acceptEdits`, `plan`, `auto` (classifier reviews actions; the built-in starting mode for interactive terminal/VS Code sessions on v2.1.283+), `dontAsk`, `bypassPermissions`.

**Key facts**

- Plan mode tells Claude to research and propose changes without making them: reads files, runs shell commands to explore, writes a plan, but does not edit source; edits stay blocked until you approve the plan. [source](https://code.claude.com/docs/en/permission-modes)
- CHANGED: How shell commands are handled during planning: if auto mode is available and `useAutoModeDuringPlan` is on (the default), the auto-mode classifier reviews commands instead of prompting you; if auto mode is unavailable or that setting is off, commands outside the built-in read-only set prompt for approval (as in Manual mode). In interactive sessions with bypass permissions available, neither applies. [source](https://code.claude.com/docs/en/permission-modes)
- Enter plan mode by pressing Shift+Tab to cycle, by prefixing a single prompt with `/plan`, or at startup with `claude --permission-mode plan`. Press Shift+Tab again to leave without approving. [source](https://code.claude.com/docs/en/permission-modes)
- CHANGED: Shift+Tab cycle: the base cycle is `default` (Manual) → `acceptEdits` → `plan`; from `auto` the first press goes to `default`. Enabled optional modes slot in after `plan`, with `bypassPermissions` first and `auto` last (`auto` appears whenever auto mode is available). `dontAsk` never appears in the cycle — set only via `--permission-mode dontAsk`. [source](https://code.claude.com/docs/en/permission-modes)
- Mode table — what runs without asking: `default` = reads only; `acceptEdits` = reads, file edits, common fs commands (`mkdir`, `touch`, `mv`, `cp`); `plan` = reads, plus classifier-approved commands when auto mode is available; `auto` = everything with background safety checks; `dontAsk` = file reads in working dirs and pre-approved tools, anything that would prompt is denied; `bypassPermissions` = everything (isolated containers/VMs only). Deny rules block in every mode, including `bypassPermissions`. [source](https://code.claude.com/docs/en/permission-modes)
- NEW: Starting mode resolution: `--permission-mode` (or `--dangerously-skip-permissions`) → `permissions.defaultMode` in settings → built-in default. Built-in default is `auto` for interactive terminal/VS Code sessions on v2.1.283+ (changelog: v2.1.284 extended it to every plan and provider), but `default` for `claude -p`/Agent SDK in sessions that fetch feature flags. `auto` or `bypassPermissions` set as `defaultMode` in project `.claude/settings.json`/`settings.local.json` does not take effect. `disableAutoMode: "disable"` in managed settings removes auto. [source](https://code.claude.com/docs/en/permission-modes) / [changelog](https://code.claude.com/docs/en/changelog)
- CHANGED: When a plan is ready the options are: **Yes, and use auto mode** (reads "Yes, auto-accept edits" if auto mode isn't available, or a bypass-permissions variant if the session started with bypass enabled), **Yes, manually approve edits**, or **No, keep planning**. Approving exits plan mode and switches to the chosen mode. With `showClearContextOnPlanAccept`, an extra first option approves and clears the planning context. The former "refine with Ultraplan" option is gone — Ultraplan was removed in v2.1.222. [source](https://code.claude.com/docs/en/permission-modes) / [changelog](https://code.claude.com/docs/en/changelog)
- Press Ctrl+G to open the proposed plan in your default text editor and edit it directly before Claude proceeds. [source](https://code.claude.com/docs/en/permission-modes)
- To make plan mode the project default, set `{"permissions": {"defaultMode": "plan"}}` in `.claude/settings.json` (VS Code-started conversations instead use `claudeCode.initialPermissionMode`). [source](https://code.claude.com/docs/en/permission-modes)
- The recommended workflow has exactly four phases: Explore (plan mode, read files, no changes), Plan (ask for a detailed implementation plan; Ctrl+G to edit it), Implement (switch out of plan mode by approving or Shift+Tab, code while verifying against the plan), Commit. [source](https://code.claude.com/docs/en/best-practices)
- Plan mode adds overhead; for small clear-scope fixes (typo, log line, variable rename) ask Claude to do it directly — "If you could describe the diff in one sentence, skip the plan." [source](https://code.claude.com/docs/en/best-practices)
- Planning is most useful when you're uncertain about the approach, when the change modifies multiple files, or when you're unfamiliar with the code being modified. [source](https://code.claude.com/docs/en/best-practices)
- CHANGED: Explore is a built-in subagent: fast, read-only (Write and Edit denied), for file discovery, code search, codebase exploration. Model: the **main conversation's model** (v2.1.198 changed it from Haiku; capped at Opus — e.g. with Fable as main model it uses Opus on subscription/Console). [source](https://code.claude.com/docs/en/sub-agents) / [changelog](https://code.claude.com/docs/en/changelog)
- Claude delegates to Explore to search/understand a codebase without changes, keeping results out of main conversation; it specifies a thoroughness level: quick, medium, or very thorough. [source](https://code.claude.com/docs/en/sub-agents)
- Built-in subagents include Explore, Plan, and general-purpose, plus helpers `claude` (catch-all, default for dispatched background sessions), `statusline-setup` (Sonnet), and `claude-code-guide` (Haiku); each runs in its own context window and returns only a summary. [source](https://code.claude.com/docs/en/sub-agents)
- The Plan built-in subagent is read-only and inherits the main conversation's model, gathering context during plan mode while the main conversation stays read-only. [source](https://code.claude.com/docs/en/sub-agents)
- Explore and Plan skip CLAUDE.md files and the parent session's git status to keep research fast; they are one-shot and return no agent ID, so they cannot be resumed (use general-purpose or a custom subagent to continue). [source](https://code.claude.com/docs/en/sub-agents)
- NEW: A "fork" subagent inherits the whole conversation (system prompt, tools, model, history) and returns only its final result; start one with `/subtask <task>` (v2.1.212+). This is different from a skill's `context: fork`, which starts fresh. [source](https://code.claude.com/docs/en/sub-agents)
- The common "infinite exploration" failure (investigating without scoping) is fixed by scoping investigations narrowly or using subagents so exploration doesn't consume main context. [source](https://code.claude.com/docs/en/best-practices)

**Anti-patterns the exam tests**

✅ **Right:** Do small clear-scope changes directly ("if you could describe the diff in one sentence, skip the plan"); enter plan mode via Shift+Tab, `/plan`, `--permission-mode plan`, or settings; remember plan mode blocks edits until approval (shell commands are classifier-reviewed or prompted); approving a plan exits plan mode into your chosen editing mode; use plan mode for complex/multi-file/architectural tasks; and delegate verbose discovery to the read-only Explore subagent.

- ❌ Using plan mode for every change, including one-line typo fixes — docs say to do small clear-scope changes directly ("if you could describe the diff in one sentence, skip the plan").
- ❌ Believing you enter plan mode by asking Claude in chat — it is set via Shift+Tab, `/plan`, `--permission-mode plan`, or settings.
- ❌ Confusing plan mode with bypassPermissions/auto — plan mode keeps source edits blocked until you approve a plan.
- ❌ Assuming approving a plan keeps you in plan mode — approving exits and switches to whichever editing mode you picked.
- ❌ Listing `dontAsk` among modes that appear in the Shift+Tab cycle — it never appears in the cycle.
- ❌ Assuming every interactive session still starts in Manual (`default`) mode — on v2.1.283+ the built-in starting mode is `auto` unless `defaultMode`/flags say otherwise (but `-p` runs that fetch feature flags start in `default`).
- ❌ Letting Claude jump straight to coding on complex/multi-file/architectural tasks.
- ❌ Doing all exploration inline instead of delegating verbose discovery to Explore.
- ❌ Thinking the Explore subagent can write/edit files — it is read-only. (And it no longer runs on Haiku; it inherits the main model.)

**Self-check (original, concept-based)**

- **Q:** A teammate needs to rename a single local variable in one function — enter plan mode first?
  **A:** No. It is describable in one sentence, so docs recommend asking Claude directly; plan mode would just add overhead.
- **Q:** How does combining plan-for-investigation with direct-execution actually keep main context clean?
  **A:** During explore/plan, Claude delegates codebase search to the read-only Explore (or Plan) subagent, which runs in its own context window and returns only a summary. Verbose reads stay isolated; then you approve the plan to implement with a clean main context.
- **Q:** Name three ways to enter plan mode.
  **A:** Shift+Tab to cycle to plan; prefix a single prompt with `/plan`; or start with `claude --permission-mode plan`. (Also `permissions.defaultMode: "plan"` in settings.)
- **Q:** What happens to plan mode when you approve a presented plan, and what are the choices?
  **A:** Approving exits plan mode and switches to the mode you chose: "Yes, and use auto mode" (or "auto-accept edits" if auto isn't available) or "Yes, manually approve edits"; "No, keep planning" stays in plan mode.
- **Q:** A developer on v2.1.290 opens Claude with no flags or `defaultMode` and is surprised commands run without prompts. Why, and how do they get prompt-for-everything behavior?
  **A:** Auto mode is now the built-in starting mode for interactive sessions; a classifier reviews actions instead of prompting. Use `--permission-mode default` (or `manual`), set `permissions.defaultMode: "default"`, or press Shift+Tab once from auto to reach Manual.

### Task 3.5: Apply iterative refinement techniques for progressive improvement

**What you need to know**

Iterative refinement means giving Claude a target it can check itself against, then looping: do the work, run the check, read the result, fix, repeat.

The most reliable target is a test suite — write tests first, confirm they fail, commit the failing tests as a checkpoint, then implement until green without editing the tests. Other verifiable targets: build exit code, linter, fixture diff, screenshot vs design.

For ambiguous requirements: (1) concrete input/output examples beat prose — few-shot/multishot with 3–5 relevant, diverse examples; (2) the interview pattern — ask Claude to interview you (AskUserQuestion tool) before coding, then capture a spec.

Structure interacting vs independent work correctly: keep dependent/state-sharing sub-tasks together, parallelize only truly independent ones; never call tools in parallel when one's parameters depend on another's output. Course-correct early; `/clear` and restart after correcting the same issue twice.

**Key facts**

- Give Claude a check it can run (tests, build, screenshot to compare) so the loop closes on its own: Claude does the work, runs the check, reads the result, and iterates until it passes. Have Claude show evidence (test output, command + result, screenshot) rather than asserting success. [source](https://code.claude.com/docs/en/best-practices)
- Verification can be enforced at increasing strength: in one prompt; across a session via a `/goal` condition re-checked by a separate evaluator after every turn; as a deterministic Stop hook that blocks the turn until the check passes; or via a second-opinion verification subagent / dynamic workflow. [source](https://code.claude.com/docs/en/best-practices)
- A Stop hook blocks the turn until the check passes, but Claude Code applies an 8-consecutive-continuation cap: after eight continuations in a row it overrides the next block and ends the turn. The count resets each time Claude calls a tool; raise it with `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`. [source](https://code.claude.com/docs/en/hooks)
- Concrete verification criteria beat vague prose — e.g. "write a validateEmail function. example test cases: user@example.com is true, invalid is false... run the tests after implementing" over "implement a function that validates email addresses". [source](https://code.claude.com/docs/en/best-practices)
- For UI changes, paste a screenshot, have Claude implement, then screenshot the result, compare to the original, list differences, and fix them. [source](https://code.claude.com/docs/en/best-practices)
- Recommended workflow is four phases: Explore (plan mode, no changes), Plan (detailed implementation plan), Implement (code while verifying against plan), Commit. Skip planning when the diff fits in one sentence. [source](https://code.claude.com/docs/en/best-practices)
- Interview pattern: start with a minimal prompt and ask Claude to interview you using the AskUserQuestion tool about implementation, UI/UX, edge cases, concerns, tradeoffs, then write a complete spec (e.g. SPEC.md); start a fresh session to execute it. The best specs are self-contained: name files/interfaces, state what's out of scope, end with an end-to-end verification step. [source](https://code.claude.com/docs/en/best-practices)
- Few-shot/multishot examples are one of the most reliable ways to steer output; include 3–5 examples, relevant, diverse (cover edge cases), and structured (wrap in `<example>`/`<examples>` tags). [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- For independent tool calls with no dependencies, make them in parallel; if some depend on previous calls, call them sequentially and never use placeholders or guess missing parameters. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- The most common prompt-chaining pattern is self-correction: generate a draft -> review against criteria -> refine based on the review. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- Tight feedback loops: course-correct as soon as Claude goes off track (Esc to stop, Esc+Esc or `/rewind` to restore or summarize, "undo that", `/clear` to reset). If you've corrected Claude more than twice on the same issue, `/clear` and start fresh with a better prompt. [source](https://code.claude.com/docs/en/best-practices)
- For fan-out across files, loop `claude -p` per file and refine the prompt based on the first 2-3 files before running at scale; pre-approve with `--allowedTools` and add `--permission-mode dontAsk` so anything else is denied in unattended runs. Alternatively `/batch <instruction>` splits a change across 5–30 subagents, each in its own worktree. [source](https://code.claude.com/docs/en/best-practices)
- NEW: Adversarial review step: before treating work as done, have a subagent review the diff in a fresh context (e.g. the bundled `/code-review` skill, or a custom "review against PLAN.md" prompt), and tell it to flag only gaps affecting correctness/requirements to avoid over-engineering. [source](https://code.claude.com/docs/en/best-practices)
- For multi-context-window tasks, have the model write tests in a structured format (e.g. tests.json) before starting, and tell it that removing/editing tests is unacceptable. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- `claude -p "..."` runs non-interactively (still creating a resumable session unless `--no-session-persistence`); output formats are text, JSON (`--output-format json`, single object with `result`), or streaming JSON (`--output-format stream-json --verbose`, one object per line starting with an init event). [source](https://code.claude.com/docs/en/best-practices)
- TDD recipe (write tests, confirm they fail, commit, implement until green without modifying tests, optionally verify with subagents that it isn't overfitting): the step-by-step list originates in the anthropic.com engineering best-practices article, which now redirects to `code.claude.com/docs/en/best-practices`; the current page instead frames it as verification + "write a failing test that reproduces the issue, then fix it" and "have one Claude write tests, then another write code to pass them" (reconfirm — not re-verified 2026-10-16 as a numbered recipe). [source](https://code.claude.com/docs/en/best-practices)

**Anti-patterns the exam tests**

✅ **Right:** Explore/plan before coding; use concrete input/output examples for transformations; use 3–5 diverse examples (not 1, not 10+); commit failing tests first as a checkpoint; aim for a general solution rather than hard-coded test values; `/clear` and restart after repeated correction failures; keep dependent/state-sharing tasks together while parallelizing only truly independent ones; have Claude interview you before a big feature; and gate the loop with a deterministic hook (or `/goal`) rather than trusting advisory CLAUDE.md text.

- ❌ Letting Claude jump straight to coding without exploration/planning (can solve the wrong problem).
- ❌ Describing a transformation only in prose when concrete input/output examples would be unambiguous.
- ❌ Loading 10+ examples or one example when 3–5 diverse ones are optimal; using near-identical examples that teach unintended patterns.
- ❌ Skipping the failing-test commit so you cannot tell whether Claude later edited the tests to make them pass.
- ❌ Letting Claude over-optimize for the specific test cases or hard-code values instead of a general solution.
- ❌ Correcting the same mistake repeatedly in one polluted session instead of `/clear`-ing and restarting.
- ❌ Running independent work strictly sequentially OR parallelizing tasks that interact/share state and depend on each other's outputs.
- ❌ Implementing a big feature from a one-line prompt instead of having Claude interview you first.
- ❌ Treating advisory CLAUDE.md text as a guarantee when only a deterministic hook (or `/goal`) actually gates the loop.
- ❌ Assuming a Stop hook can block forever — after 8 consecutive continuations Claude Code ends the turn anyway (configurable cap).

**Self-check (original, concept-based)**

- **Q:** Converting messy address strings into a normalized JSON schema — why prefer concrete input/output pairs over a written description of the rules?
  **A:** Examples are one of the most reliable ways to steer output format/structure; 3–5 relevant, diverse examples covering edge cases reduce ambiguity far more than prose. Wrap them in `<example>`/`<examples>` tags to distinguish from instructions.
- **Q:** Why does TDD insist on committing the failing tests before implementation?
  **A:** Claude sometimes edits tests to make them pass rather than fixing the code. Committing failing tests first creates a checkpoint that shows what Claude altered and gives a clear red-to-green target.
- **Q:** Three sub-tasks: two share a data model, one is a standalone doc update — how to structure?
  **A:** Keep the two interacting/state-sharing tasks together (single message / sequential dependent steps) so context is shared; run the independent doc task separately or in parallel. Never parallelize calls where one's parameters depend on another's output.
- **Q:** For a large, ambiguous feature, what before any code, and why a new session afterward?
  **A:** Use the interview pattern: ask Claude to interview you with the AskUserQuestion tool, then write a self-contained spec. Start a fresh session to execute it so the implementation has clean context and a written spec to reference.
- **Q:** You want an unattended run to keep going until `npm test` passes, with no human watching. Which mechanisms are deterministic, and what limit applies?
  **A:** A Stop hook that runs the tests and blocks the turn until they pass (deterministic), or a `/goal` condition re-checked by an evaluator each turn. The Stop hook is subject to an 8-consecutive-continuation cap (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` to change).

### Task 3.6: Integrate Claude Code into CI/CD pipelines

**What you need to know**

CI/CD integration rests on headless (non-interactive) mode: passing `-p`/`--print` runs a single query via the Agent SDK and exits (exit code 0 on success, non-zero on failure), so a pipeline never blocks on terminal input.

For machine-parseable findings, combine `-p` with `--output-format json` (or `stream-json`); `json` returns a wrapper whose human text sits in `result` alongside metadata like `session_id` and `total_cost_usd`. To force a defined shape, add `--json-schema '<schema>'` — the SDK validates, re-prompts on mismatch, and places the validated payload in `structured_output` (not `result`).

A repo-root CLAUDE.md supplies project context; `--allowedTools`/`--permission-mode` (e.g. `acceptEdits`, `dontAsk`) pre-approve or lock down actions so the run does not stall, and `--permission-prompts none` (v2.1.259+) denies anything that would otherwise wait on a permission host. Prefer `--bare` for reproducible CI runs (recommended for scripted/SDK calls and slated to become the `-p` default). When the CI step asks Claude to generate tests, pass the existing test files as context so it adds only missing coverage instead of re-creating scenarios the suite already covers — a separate concern from review-*comment* deduplication.

Anthropic's managed Code Review (Team/Enterprise) and `anthropics/claude-code-action@v1` build on this: independent agents analyze the diff on separate infrastructure, then findings are verified, deduped, severity-ranked, and posted as inline PR comments, with later reviews resolving threads whose issues were fixed.

**Key facts**

- `-p` (alias `--print`) runs Claude Code non-interactively via the Agent SDK and exits — the core flag for scripts and CI/CD. `--bg` can't be combined with `-p`. [source](https://code.claude.com/docs/en/cli-reference)
- `--output-format` accepts `text` (default), `json`, or `stream-json`; `json` returns structured JSON with the text result in `result` plus session ID and metadata. `stream-json` needs `--verbose` (and `--include-partial-messages` for token deltas); its last line is a `result` message. [source](https://code.claude.com/docs/en/headless)
- With `--output-format json`, the payload includes `total_cost_usd` and a per-model cost breakdown so scripted callers can track spend per invocation (client-side estimates; resumed runs report the conversation's whole total). [source](https://code.claude.com/docs/en/headless)
- `--json-schema '<schema>'` (print mode only) returns validated JSON matching a JSON Schema after the agent completes its workflow; the SDK validates and re-prompts on mismatch, placing data in `structured_output` (separate from `result`). An invalid schema exits with `Error: --json-schema is not a valid JSON Schema`; the `format` keyword is accepted as an annotation but not enforced. [source](https://code.claude.com/docs/en/cli-reference) / [headless](https://code.claude.com/docs/en/headless)
- In the Agent SDK, structured output is requested via `outputFormat` (TS) / `output_format` (Python) of type `json_schema`; success result has `subtype: "success"` and a `structured_output` field, failure has `subtype: error_max_structured_output_retries`. A `success` result with no `structured_output` should also be treated as a failure. Schemas are validated as JSON Schema draft-07. [source](https://code.claude.com/docs/en/agent-sdk/structured-outputs)
- A repo-root CLAUDE.md defines code style guidelines, review criteria, project rules, and preferred patterns Claude follows on every CI run; keep it concise since it is read every run. For managed Code Review, the root CLAUDE.md plus CLAUDE.md files in parent directories of each changed file are read. [source](https://code.claude.com/docs/en/github-actions) / [code-review-customize](https://code.claude.com/docs/en/code-review-customize)
- `--allowedTools` (alias `--allowed-tools`) lists tools that execute without prompting (permission-rule syntax; `Bash(git diff *)` — the space before `*` matters); to *restrict* the tool set use `--tools`, and `--disallowedTools` removes/denies. [source](https://code.claude.com/docs/en/cli-reference) / [headless](https://code.claude.com/docs/en/headless)
- Permission rules use `Tool` or `Tool(specifier)` syntax and are evaluated deny → ask → allow (first match wins; specificity doesn't change the order), so an allow rule can't carve an exception out of a deny, and a deny at any settings scope beats an allow at any other. A PreToolUse hook's "allow" doesn't bypass deny/ask rules. [source](https://code.claude.com/docs/en/permissions)
- Settings precedence (highest first): managed settings → command line (`--settings` JSON / flags) → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json`. [source](https://code.claude.com/docs/en/settings)
- CHANGED: Baseline permission modes for CI: `dontAsk` denies every call that would otherwise prompt — reads in working dirs, the read-only command set, and `--allowedTools`/`permissions.allow` matches still run, while `AskUserQuestion` and interaction-required tools are denied even if allowed; `acceptEdits` auto-approves file writes plus common fs commands (mkdir/touch/mv/cp), other shell/network still needs allow rules; `auto` has a classifier review actions. Because a run with no mode set takes the built-in starting mode (which can be `auto`), pass the mode you want explicitly. [source](https://code.claude.com/docs/en/headless)
- NEW: `--permission-prompts none` (v2.1.259+): in unattended runs, anything that would prompt is denied (unless a `PermissionRequest` hook allows it) instead of waiting on an SDK `canUseTool` host or `--permission-prompt-tool`; Claude is told not to retry and `AskUserQuestion` is removed. Denials appear in `permission_denials`. [source](https://code.claude.com/docs/en/headless)
- CHANGED: `--bare` skips auto-discovery of hooks, skills, custom commands, subagents, installed plugins, MCP servers, auto memory, and CLAUDE.md for deterministic, faster scripted/CI runs; it gives only Bash/file read/file edit tools, sets `CLAUDE_CODE_SIMPLE`, never reads OAuth/keychain (use `ANTHROPIC_API_KEY` or `apiKeyHelper`). Since v2.1.286 it also connects only CLI-supplied MCP servers, sends no system reminders, and starts no background tasks. Pass context explicitly with `--append-system-prompt(-file)`, `--settings`, `--mcp-config`, `--agents`, `--plugin-dir`. Docs say `--bare` "will become the default for `-p` in a future release." [source](https://code.claude.com/docs/en/headless) / [cli-reference](https://code.claude.com/docs/en/cli-reference)
- Without `--bare`, a `-p` session runs the project's `.claude/settings.json` hooks and connects its `.mcp.json` servers with no workspace-trust dialog — a reason to use `--bare` on untrusted checkouts. [source](https://code.claude.com/docs/en/headless)
- `--max-turns` limits agentic turns (print mode only; no limit by default; exits with an error when reached); `--max-budget-usd` stops the run once estimated spend reaches the cap (print mode only). [source](https://code.claude.com/docs/en/cli-reference)
- Session continuity in scripts: `--continue` resumes the most recent conversation; `--resume <session_id>` (captured via `jq -r '.session_id'`) resumes a specific one (it can also take a `.jsonl` transcript path); `--fork-session` with either creates a new session ID instead of reusing the original; `--no-session-persistence` disables saving. [source](https://code.claude.com/docs/en/headless) / [cli-reference](https://code.claude.com/docs/en/cli-reference)
- `--append-system-prompt` adds instructions while keeping Claude Code's defaults (preferred for CI review scripts); `--system-prompt` replaces the whole default prompt (dropping tool guidance and safety instructions). [source](https://code.claude.com/docs/en/cli-reference)
- `anthropics/claude-code-action@v1` is the official GitHub Action; in v1 CLI options move into `claude_args` (e.g. `--max-turns`, `--model`, `--allowedTools`, `--mcp-config`), `direct_prompt` became `prompt`, `mode` was removed (auto-detected: no `prompt` = interactive mode waiting for the trigger phrase; `prompt` set = automation mode), and `custom_instructions` becomes `--append-system-prompt`. Default `trigger_phrase` is `@claude`. Default `--max-turns` in the action context is 10 (reconfirm — not re-verified 2026-10-16; the current page doesn't state a default). [source](https://code.claude.com/docs/en/github-actions)
- NEW: Other action inputs: `anthropic_api_key` or `claude_code_oauth_token` (from `claude setup-token`), workload identity federation (`anthropic_federation_rule_id`, `anthropic_organization_id`, …, needs `id-token: write`), `github_token`, `settings`, `plugins`/`plugin_marketplaces`, `use_bedrock`/`use_vertex`/`use_foundry`. Only users with write access trigger runs; bots need `allowed_bots`. The `prompt` input can be a skill invocation (`/skill-name` after `actions/checkout`). [source](https://code.claude.com/docs/en/github-actions)
- `/install-github-app` (quick setup) installs the Claude GitHub App, saves `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` as a repo secret, and opens a PR with the workflow files; github.com only, needs the `gh` CLI and repo admin. Workflow setup is optional (v2.1.187); the review workflow posts inline comments on the PR (v2.1.229+). [source](https://code.claude.com/docs/en/github-actions) / [changelog](https://code.claude.com/docs/en/changelog)
- CHANGED: Managed Code Review (Team and Enterprise plans; not available with Zero Data Retention, the HIPAA configuration, or customer-managed encryption keys; no longer labelled "research preview" on the live page) runs on Anthropic infrastructure in four stages: Find (several agents in parallel), Verify (filter false positives), Rank (dedupe + severity), Post (inline comments, summary, check run). It reads code without building or running it and never pushes commits. [source](https://code.claude.com/docs/en/code-review)
- Code Review severities: 🔴 Important, 🟡 Nit, 🟣 Pre-existing. The **Claude Code Review** check run concludes neutral (or skipped) and never as a failure, so it never blocks merge; a machine-readable `bughunter-severity` comment parses with gh + jq into keys `normal` (= Important count) / `nit` / `pre_existing`; treat a missing line as "no verdict", not zero. [source](https://code.claude.com/docs/en/code-review-pull-requests)
- NEW: Code Review review levels — Quick, Standard (default), Deep — set org-wide or per repo; **Review runs** per repo: Once after PR creation, After every push (default for newly added repos), or Manual. Comment commands: `@claude review` = one review without subscribing (changed July 2026; previously it subscribed), `@claude review always` = review + subscribe to push-triggered reviews. Drafts and fork PRs are skipped automatically. [source](https://code.claude.com/docs/en/code-review-pull-requests) / [code-review](https://code.claude.com/docs/en/code-review)
- Re-reviews: a later automatic review focuses on what changed since the last review and posts fewer nits/pre-existing findings; it resolves its earlier threads when it judges the issue fixed. [source](https://code.claude.com/docs/en/code-review-pull-requests)
- CHANGED: `REVIEW.md` (repo root, optionally subdirectories) is review-only guidance given to the finding and verifying agents as the repository's review instructions alongside Code Review's default guidance (the live docs no longer describe it as a "highest-priority system prompt"). It is read from the base/default branch, never from the PR's own changes; severity lowering, path exclusions, and nit caps are honored only when it comes from a protected default branch. The local `/code-review` command reads CLAUDE.md but not REVIEW.md. `@` imports are NOT expanded in REVIEW.md (reconfirm — not re-verified 2026-10-16). [source](https://code.claude.com/docs/en/code-review-customize)
- CHANGED: Code Review cost: no flat per-review price — billed on token usage through usage credits to the organization, scaling with review level, change size, and verification work; per-repo average cost shows in admin settings, and a monthly spend limit can be set. (The earlier "$15–25 and ~20 minutes per review" figures are no longer stated.) [source](https://code.claude.com/docs/en/code-review-costs)
- GitLab CI/CD integration (beta, maintained by GitLab) invokes `claude -p "..." --permission-mode acceptEdits --allowedTools "..."` inside an isolated job container (image `node:24-alpine3.21`, install via `curl -fsSL https://claude.ai/install.sh | bash`). [source](https://code.claude.com/docs/en/gitlab-ci-cd)
- `claude setup-token` generates a long-lived (one-year) OAuth token for CI/scripts; requires a Claude subscription; prints but does not save it; set it as `CLAUDE_CODE_OAUTH_TOKEN` (note: NOT read in `--bare` mode). [source](https://code.claude.com/docs/en/authentication)
- CHANGED: The announced June 15, 2026 switch of Agent SDK / `claude -p` subscription usage to a separate monthly Agent SDK credit was **paused**; per Anthropic's help center, `claude -p` and Agent SDK usage still draw from subscription limits (an Oct 7, 2026 update adds monthly API credits on Max and Team plans covering Agent SDK usage). [source](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- Piped stdin to `claude -p` is capped at 10MB; exceeding it exits with an error and non-zero status (write large input to a file and reference the path instead). The cap was introduced in v2.1.128 (reconfirm — not re-verified 2026-10-16; the live page no longer names the version). Bedrock model IDs include a region prefix, e.g. `us.anthropic.claude-sonnet-4-6` (reconfirm — not re-verified 2026-10-16). [source](https://code.claude.com/docs/en/headless)
- Test-scenario deduplication is distinct from review-comment dedup: to stop a CI-invoked Claude instance from re-writing tests the suite already has, supply the EXISTING test files as context so it writes only missing coverage; document testing standards and available fixtures in a repo-root CLAUDE.md ([source](https://code.claude.com/docs/en/github-actions)) as the project-context mechanism. `[guide-specific]`

**Anti-patterns the exam tests**

✅ **Right:** Use `-p`/`--print` for non-interactive runs; parse `--output-format json` (and `--json-schema` for a guaranteed shape) instead of regexing free-form text; read schema-validated data from `structured_output` (and the plain answer from `result`); set the permission mode explicitly and pre-approve with `--allowedTools` (plus `--permission-prompts none` for fully unattended hosts); use `--bare` for reproducible runs; keep API keys in secrets; use an independent review instance plus push-triggered re-reviews / REVIEW.md rules; and gate merges yourself by parsing severity counts since Code Review's check run never fails.

- ❌ Running plain `claude "query"` (interactive) in a pipeline — it waits for terminal input and hangs the job; the fix is `-p`/`--print`.
- ❌ Parsing free-form text with regex instead of `--output-format json` (and `--json-schema` for a guaranteed shape).
- ❌ Reading the schema-validated payload from `result` — it lives in `structured_output`; `result` holds the plain-text answer.
- ❌ Leaving the permission mode/allowlist unset in CI so the run stalls or denies the first tool — or assuming it starts in Manual when the built-in default may be `auto`.
- ❌ Putting API keys in the workflow file instead of secrets.
- ❌ Asking the same session that generated the code to also review it, rather than an independent review instance.
- ❌ Re-running full reviews that re-post known findings instead of relying on push-triggered re-reviews (which focus on new changes and resolve fixed threads) and REVIEW.md rules (nit caps, exclusions).
- ❌ Assuming Code Review blocks merges — its check run concludes neutral, never failure; gate merges yourself by parsing the severity counts (`normal` > 0).
- ❌ Expecting `REVIEW.md` changes in a PR to affect that PR's review — it is read from the base/default branch.
- ❌ Expecting `CLAUDE_CODE_OAUTH_TOKEN` to work with `--bare` — bare mode reads only `ANTHROPIC_API_KEY`/`apiKeyHelper`.
- ❌ Generating CI tests without providing the current test files — Claude re-creates scenarios the suite already covers; supply the existing tests (and document fixtures/standards in CLAUDE.md) so it adds only missing coverage.

**Self-check (original, concept-based)**

- **Q:** Your CI extracts findings as JSON but the parser keeps grabbing prose; you used `--output-format json --json-schema '...'` — which field holds the validated data?
  **A:** The `structured_output` field. `result` holds the plain-text answer; only schema-conforming validated data goes into `structured_output`.
- **Q:** Why is `-p`/`--print` essential beyond just printing the answer?
  **A:** It runs non-interactively (single query then exit, with a meaningful exit code), so the job never blocks on terminal input. Pair with an explicit `--permission-mode` and `--allowedTools` (and `--permission-prompts none` when a permission host exists but nobody answers) so prompts don't stall it.
- **Q:** Why favor an independent review instance over re-using the coding session, and how does managed review avoid piling up duplicate comments across pushes?
  **A:** A fresh agent reviews the diff without the original session's bias, on separate infrastructure. Findings are verified and deduplicated; later push-triggered reviews focus on what changed, post fewer nits, and resolve threads for fixed issues; REVIEW.md can cap nits and exclude paths.
- **Q:** What does CLAUDE.md contribute in a CI review, and the caveat in `--bare` mode?
  **A:** It supplies project context (standards, review criteria, fixtures, conventions) Claude follows every run. Caveat: `--bare` skips CLAUDE.md (and hooks/skills/commands/subagents/plugins/MCP/auto-memory) auto-discovery, so you must pass needed context explicitly via flags.
- **Q:** Your CI step asks Claude to write tests but it keeps re-writing tests that already exist — is the fix `--json-schema`, a REVIEW.md rule, or something else?
  **A:** Something else. `--json-schema` only forces output shape and REVIEW.md governs review *comments*; neither stops duplicate test *scenarios*. Provide the existing test files as context (and document fixtures/testing standards in CLAUDE.md) so Claude adds only the missing coverage.
- **Q:** A team wants a merge gate on Code Review. The check run is green-ish even with bugs flagged. What should their CI do?
  **A:** Read the check run's details with `gh api` + jq, extract the `bughunter-severity` JSON, and fail the job when `normal` (Important) > 0; treat a missing line as no verdict, since the check run itself never concludes as failure.

## Concept glossary (this domain's appendix slice)

- **CLAUDE.md** - Author-written markdown instruction file loaded into context at session start (in full, every session) to give Claude persistent project/user/org guidance; treated as context, not enforced. [source](https://code.claude.com/docs/en/memory)
- **User-level memory (~/.claude/CLAUDE.md)** - Personal preferences for all your projects on this machine; not shared via version control. [source](https://code.claude.com/docs/en/memory)
- **Project-level memory** - Team-shared instructions at `./CLAUDE.md` or `./.claude/CLAUDE.md`, distributed through source control. [source](https://code.claude.com/docs/en/memory)
- **CLAUDE.local.md** - Gitignored project-root file for personal project-specific preferences, appended after CLAUDE.md within its directory; exists only in the worktree where created. [source](https://code.claude.com/docs/en/memory)
- **Managed policy CLAUDE.md** - Org-wide CLAUDE.md at an OS-specific system path (or inline via the managed-settings `claudeMd` key); loads before user/project files and cannot be excluded by individual settings. [source](https://code.claude.com/docs/en/memory)
- **AGENTS.md** - Cross-tool instruction file; Claude Code (v2.1.277+) reads it when no CLAUDE.md/CLAUDE.local.md exists in cwd or above, configurable via **Project instructions** in `/config`; otherwise import it with `@AGENTS.md`. [source](https://code.claude.com/docs/en/memory)
- **@import syntax** - `@path/to/import` reference inside CLAUDE.md; relative to the importing file, recursive up to four hops, loaded at launch (does not reduce context). [source](https://code.claude.com/docs/en/memory)
- **.claude/rules/** - Directory of modular topic-specific markdown rules; recursive discovery, supports symlinks and path-scoped frontmatter. [source](https://code.claude.com/docs/en/memory)
- **Path-specific rule** - A `.claude/rules/*.md` file with YAML `paths` glob frontmatter (list or comma-separated string) that loads only when Claude reads/writes/edits files matching the pattern. [source](https://code.claude.com/docs/en/memory)
- **/memory command** - Lists CLAUDE.md, CLAUDE.local.md, and other memory file locations (creating missing ones on selection), toggles auto memory, and opens the auto-memory folder. [source](https://code.claude.com/docs/en/memory)
- **/context command** - Shows context usage, including the **Memory files** that loaded at launch — the documented way to confirm a CLAUDE.md/rules file loaded. [source](https://code.claude.com/docs/en/memory)
- **/init command** - Generates a starting project CLAUDE.md from codebase analysis; suggests improvements rather than overwriting if one exists. [source](https://code.claude.com/docs/en/memory)
- **Auto memory (MEMORY.md)** - Claude-written notes at `~/.claude/projects/<project>/memory/`, distinct from author-written CLAUDE.md; first 200 lines/25KB of MEMORY.md load each session. [source](https://code.claude.com/docs/en/memory)
- **claudeMdExcludes** - Settings key (glob/path patterns matched against absolute paths) to skip ancestor CLAUDE.md/rules files; managed-policy files cannot be excluded. [source](https://code.claude.com/docs/en/memory)
- **InstructionsLoaded hook** - A hook that logs which instruction files load, when, and why — for debugging path-specific and lazy-loaded rules. [source](https://code.claude.com/docs/en/memory)
- **SKILL.md** - Required entrypoint of a skill directory: YAML frontmatter plus markdown instructions Claude follows when the skill runs. [source](https://code.claude.com/docs/en/skills)
- **context: fork** - Frontmatter setting that runs a skill in an isolated subagent with no access to main conversation history (SKILL.md content becomes the subagent prompt); runs in the background by default since v2.1.218 (`background: false` to wait). [source](https://code.claude.com/docs/en/skills)
- **allowed-tools** - Frontmatter field that pre-approves listed tools during the invoking turn (skips prompts; grant clears on next message); does not restrict the tool pool. [source](https://code.claude.com/docs/en/skills)
- **argument-hint** - Optional frontmatter field giving the autocomplete hint for a skill/command's expected arguments, e.g. `[issue-number]`. [source](https://code.claude.com/docs/en/skills)
- **disable-model-invocation** - Frontmatter flag (true) that prevents Claude from auto-loading a skill and removes its description from context; the user can still invoke it with `/name`. [source](https://code.claude.com/docs/en/skills)
- **user-invocable** - Frontmatter flag (false) that hides a skill from the `/` menu so only Claude can invoke it. [source](https://code.claude.com/docs/en/skills)
- **Project-scoped skill/command** - Skill in `.claude/skills/` (or command in `.claude/commands/`) committed to VCS and shared with the team. [source](https://code.claude.com/docs/en/skills)
- **User-scoped skill/command** - Skill in `~/.claude/skills/` (or command in `~/.claude/commands/`) available across all your projects, not shared via the repo. [source](https://code.claude.com/docs/en/skills)
- **Dynamic context injection** - `` !`command` `` syntax that runs a shell command before Claude sees the skill and inlines the output (preprocessing). [source](https://code.claude.com/docs/en/skills)
- **agent (frontmatter)** - Field naming which subagent type executes a `context: fork` skill (Explore, Plan, general-purpose, or custom); defaults to general-purpose. [source](https://code.claude.com/docs/en/skills)
- **Plan mode** - A permission mode where Claude researches and proposes a plan but makes no source edits until you approve; shell commands are classifier-reviewed (when auto mode is available) or prompted. [source](https://code.claude.com/docs/en/permission-modes)
- **Manual mode (`default`)** - The permission mode that asks before most edits/commands; renamed "Manual" in the UI in v2.1.200, config value `default`, alias `manual`. [source](https://code.claude.com/docs/en/permission-modes)
- **Auto mode** - Permission mode where a classifier model reviews actions instead of prompting; built-in starting mode for interactive sessions on v2.1.283+; removable via managed `disableAutoMode`. [source](https://code.claude.com/docs/en/permission-modes)
- **dontAsk mode** - Locked-down mode for CI: anything that would prompt is denied; only reads, read-only commands, and allow-listed tools run; never in the Shift+Tab cycle. [source](https://code.claude.com/docs/en/permission-modes)
- **Shift+Tab cycle** - The CLI keystroke that cycles permission modes `default` → `acceptEdits` → `plan` (then optional `bypassPermissions`, `auto`); from auto, the first press goes to Manual. [source](https://code.claude.com/docs/en/permission-modes)
- **defaultMode** - A `permissions` setting in settings.json that sets the session's starting permission mode (e.g. `plan`); `auto`/`bypassPermissions` in project settings don't take effect. [source](https://code.claude.com/docs/en/permission-modes)
- **Explore-then-plan-then-code** - Anthropic's recommended four-phase workflow (Explore, Plan, Implement, Commit) separating research/planning from execution. [source](https://code.claude.com/docs/en/best-practices)
- **Direct execution** - Letting Claude make the change immediately without a planning phase; recommended for small, clearly-scoped changes. [source](https://code.claude.com/docs/en/best-practices)
- **Explore subagent** - A built-in, read-only subagent (inherits the main model since v2.1.198; formerly Haiku) for codebase search/discovery that keeps verbose results in its own context and returns only a summary. [source](https://code.claude.com/docs/en/sub-agents)
- **Plan subagent** - A built-in read-only research subagent used during plan mode to gather context before a plan is presented; inherits the main conversation's model. [source](https://code.claude.com/docs/en/sub-agents)
- **Test-driven iteration** - Write tests first, confirm they fail, commit them, then implement until all tests pass without modifying the tests — an unambiguous red-to-green target. [source](https://code.claude.com/docs/en/best-practices)
- **Verification loop** - A check Claude can run itself (tests, build, linter, fixture diff, screenshot) so it iterates without the human being the verification step. [source](https://code.claude.com/docs/en/best-practices)
- **Interview pattern** - Starting from a minimal prompt and asking Claude to interview you (via AskUserQuestion) to surface edge cases and tradeoffs before implementing, producing a spec. [source](https://code.claude.com/docs/en/best-practices)
- **Multishot (few-shot) prompting** - Steering output with 3–5 relevant, diverse, structured input/output examples; more reliable than prose for transformations. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Self-correction chaining** - A refinement pattern: generate a draft, review against criteria, then refine based on the review. [source](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- **Course-correction** - Tight feedback loops using Esc (stop), Esc+Esc / `/rewind` (restore), "undo that", and `/clear` (reset) to redirect Claude early. [source](https://code.claude.com/docs/en/best-practices)
- **-p / --print (headless mode)** - Run Claude Code non-interactively via the Agent SDK and exit — prevents pipelines from hanging on input. [source](https://code.claude.com/docs/en/cli-reference)
- **--output-format** - Print-mode flag selecting response shape: text (default), json (result + metadata), or stream-json (NDJSON events). [source](https://code.claude.com/docs/en/headless)
- **--json-schema** - Print-mode flag forcing output to match a JSON Schema; validated data returns in the `structured_output` field. [source](https://code.claude.com/docs/en/cli-reference)
- **structured_output** - Result field holding schema-validated JSON when `--json-schema` / `output_format json_schema` is used (distinct from `result`). [source](https://code.claude.com/docs/en/agent-sdk/structured-outputs)
- **--permission-prompts none** - Print-mode flag (v2.1.259+) that denies anything that would prompt instead of waiting on a permission host; for unattended runs. [source](https://code.claude.com/docs/en/headless)
- **claude-code-action@v1** - Official GitHub Action that runs Claude Code in workflows; CLI options pass through `claude_args`, prompt via the `prompt` input (omit it for `@claude` interactive mode). [source](https://code.claude.com/docs/en/github-actions)
- **Code Review (managed)** - Team/Enterprise service: parallel agents analyze a PR on Anthropic infra, verify, dedupe, severity-rank (Important/Nit/Pre-existing), and post inline comments plus a never-failing check run. [source](https://code.claude.com/docs/en/code-review)
- **REVIEW.md** - Review-only instruction file for managed Code Review, read from the base/default branch and given to the review agents alongside default guidance; not read by local `/code-review`. [source](https://code.claude.com/docs/en/code-review-customize)
- **--bare** - Minimal mode skipping auto-discovery of hooks/skills/commands/subagents/plugins/MCP/auto-memory/CLAUDE.md for deterministic, faster CI runs; recommended for scripted calls. [source](https://code.claude.com/docs/en/headless)

## Sources

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/settings-reference
- https://code.claude.com/docs/en/large-codebases
- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/changelog
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (former `multishot-prompting` and `be-clear-and-direct` URLs redirect here)
- https://www.anthropic.com/engineering/claude-code-best-practices (now redirects to code.claude.com/docs/en/best-practices)
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/agent-sdk/structured-outputs
- https://code.claude.com/docs/en/github-actions
- https://code.claude.com/docs/en/code-review
- https://code.claude.com/docs/en/code-review-pull-requests
- https://code.claude.com/docs/en/code-review-customize
- https://code.claude.com/docs/en/code-review-costs
- https://code.claude.com/docs/en/gitlab-ci-cd
- https://code.claude.com/docs/en/authentication
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
