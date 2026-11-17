# Doc conventions (build · docs step)

Loaded at every docs step with `weight-heuristics.md`.

## Procedure
1. Read the brief and actual changes (`git status`, `git diff`, new files). Inventory things
   of weight using `weight-heuristics.md`; zero items is valid.
2. Read the README fully and follow its relative links one level deep. Match the repo's layout,
   naming, headings, cross-links, and language.
3. Update every doc the change made stale; put new content where the convention dictates,
   reachable from README or the index/sidebar. Edit surgically; don't reflow untouched prose.
4. Verify commands, flags, and examples against real code before writing them.
5. **Agent retro:** a convention, workaround, or gotcha the next trail's agent would re-learn
   the hard way? Append one tight line to the repo's existing `CLAUDE.md` / `AGENTS.md`.
   Zero additions is the norm.

Record files + a one-line weight reason each (or nothing of weight), every
`TBD — author to fill in`, and unverified claims in the brief's **Evidence**.

## Write lean
Weight decides whether; this decides how much. Every doc line is upkeep.
- Carry the *why* and non-obvious; code and config are the truth for *what*. Don't narrate
  implementation or restate names, signatures, config values, defaults, or per-environment
  state — point to the source file.
- Smallest edit that carries the fact: sentence before section, section before file. One home
  per fact — link, don't repeat.
- No intros, overviews, recaps, or examples unless usage is non-obvious. Match the surrounding
  density; when unsure, write less.

## Rules
- Docs only during this step — don't change behavior/code or tests. Pre-existing changes follow
  build §1.
- Never invent rationale; mark unknown why as `TBD — author to fill in`.
- No version numbers in prose unless a floor is load-bearing. No AI-attribution footers.

## Common layouts
1. **Flat `docs/`** — kebab-case topic files, README links straight to each. Add a new topic
   file for a new cross-cutting concern; extend an existing file for additions to its topic.
2. **`docs/` with subfolders** by audience/type (`guides/`, `reference/`, `integrations/`,
   `tools/`, `architecture/`). Place new content in the matching subfolder.
3. **ADR-driven** — numbered files under `docs/adr/` or `docs/architecture/decisions/`, each
   with Status / Context / Decision / Consequences. New architectural decisions become new
   numbered ADRs. Copy an existing ADR's structure exactly (numbering width, section names,
   status vocabulary).
4. **Per-module READMEs** — `README.md` nested in source folders. Changes to a module get
   documented in that module's README; cross-module changes go up a level.
5. **Docs-as-site** (Docusaurus/VitePress/MkDocs) — check the sidebar/nav config first; new docs
   must be added to both the file tree *and* the sidebar config or they won't render.

## Match the details
- **File naming** — follow the majority pattern in the target folder (kebab-case / PascalCase /
  numbered). SCREAMING_SNAKE only for root meta files (`README`, `CONTRIBUTING`).
- **Headings** — match existing (single `#` title vs frontmatter title vs starting at `##`).
- **Cross-links** — match existing (relative paths / root-absolute / bare). When in doubt, use
  relative paths.
- **Language** — if existing docs are in another language, write in it.

## When signals conflict
Follow the pattern of the **most recently modified** docs (`git log -1 --format=%ci <file>`).
Recent > old when conventions drifted. Add a new doc's link to the section the README already
uses; if none, add a `## Documentation` section near the end.
