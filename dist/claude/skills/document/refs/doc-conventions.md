# Doc conventions (document)

Loaded when the repo's doc convention is unclear. Learn the structure starting from the README —
read it fully, follow its relative links one level deep.

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
