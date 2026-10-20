---
name: study-page
description: Make an easy-to-digest study page on one topic for the "Claude Certified Architect – Foundations" exam (for example the Messages API, hooks, MCP scopes, structured outputs, batches), built only from this repo's study docs and ending with the exam traps for that topic. Publishes it as an Artifact when the session can, otherwise writes a local HTML file. Use when the user asks for an artifact, page, explainer, cheat sheet or overview of an exam topic.
---

# study-page

You make one study page about one exam topic. The page explains the topic in plain language, shows the rules that matter, and ends with the traps the exam sets on it. All paths are relative to the repo root.

## 1. Find the material

1. Read `reference/study/INDEX.md` to see which domain or domains the topic belongs to.
2. Find the topic's task statements in the domain docs (`reference/study/domain-*.md`). Search for the topic's key terms rather than reading every doc in full. A topic often spans several domains: the Messages API, for example, touches Domains 1, 2, 4 and 5.
3. Read those task-statement sections in full: "What you need to know", the key facts, the anti-patterns (`✅` and `❌` lines) and the self-checks.

If the topic isn't covered by the study docs, say so and ask the user whether to narrow it to something the docs cover. Don't fill the gap from your own knowledge.

## 2. Content rules

- **Only facts from the study docs.** Every specific (parameter names, values, limits, model IDs, flags, defaults) must come from the docs. Keep the docs' source links for the important facts.
- **Mark what changed.** Facts the docs label `CHANGED` or `NEW`, or that the refresh changelog (`reference/study/CHANGES-*.md`) lists, get a clear "changed in <year>" note. Where the exam may still expect the older behaviour, say so and give both.
- **Flag uncertainty.** Facts the docs mark "reconfirm" or "docs are silent" are shown as unconfirmed, not as settled.
- **Never copy the exam guide's sample questions or their answers** (`reference/instructor.pdf`) onto the page.
- **Mock in progress:** if a mock exam is running in this conversation and the page would answer the current question, tell the user before making it, and offer to count the question as hinted.

## 3. Page structure

Use the same sections, in this order, on every page so the pages read as a set:

1. **Title and one-line summary** — what the topic is and why it matters for the exam.
2. **Mental model** — the two to four ideas that make everything else make sense.
3. **The details** — how it works: request/config shapes, tables of options and what each one does, short code or JSON examples where the docs give them. Group by sub-topic, one section each.
4. **Exam trap** callouts — at the end of each sub-topic, the trap from the docs' `❌` lines, written as "what people get wrong, and what's actually true".
5. **Changed recently** callouts, where they apply (see the content rules).
6. **Checklist** — a short numbered list of the facts to remember the night before the exam.
7. **Footer** — the study docs used, their "refreshed" date from `INDEX.md`, and a line saying the live docs win if they disagree.

Write plainly, for someone who knows how to program but is new to the topic. Prefer tables for options and comparisons, and keep paragraphs short.

## 4. Publish

- **If the Artifact tool is available:** follow its instructions for making a new page (its quickstart and design guidance), give the page a short specific title such as "Messages API Field Guide", and publish it. Tell the user the link, what the page covers, and anything you flagged as changed or unconfirmed.
- **Otherwise:** write a single self-contained HTML file to `pages/<topic-slug>.html` (the folder is gitignored) with inline CSS that works in light and dark mode and at phone width, then tell the user the full path so they can open it in a browser.

## Rules

- Don't edit the study docs or any other file in the repo; this skill only produces the page.
- Don't commit anything.
- One topic per page. If the user asks for several, offer one page each.
