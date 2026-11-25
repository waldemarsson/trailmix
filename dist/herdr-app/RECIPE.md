# Trails

A panel docked on the right that lists the [trailmix](https://github.com/waldemarsson/trailmix)
trails in every space, local or on another machine, with where each one stands. Click a trail to
read its brief or report. A toast tells you when a trail is waiting on you.

**What you see:** a 280px column on the right. A 36px header reads "Trails". Below it, one card
per space with open trails (surface background, 1px border, 8px radius, 6px apart). The card's
header has the space name in bold 12px, a `2 done · 1 dropped` count in dim type when there are
any, and, for a remote space, the machine as a small chip. Under it, one row per open trail: the
title (its slug when untitled), then an outlined pill with its status: `Discussing`, `Needs
sign-off`, `Building 1/3 · T2`, `Self-review`, `Needs review · 2 pending`. A space whose status
can't be read shows a one-line error in red inside its card. Spaces whose trails are all done or
dropped collapse into one dim line at the bottom (`3 spaces · 5 done`); spaces without trails
don't appear. With none anywhere the panel says "No trails in any space".

**How it behaves:**
- A trail waiting on you (`Needs sign-off`, `Needs review`) gets its pill in the theme's
  `blocked` color; building in `working`; discussing in `muted`.
- The header's `↓ Space order` / `↓ Priority` switches the order. Space order follows the
  sidebar. Priority puts trails waiting on you first, then building, then the rest, both within a
  card and across cards (a card by its most urgent trail; an unreadable one last). The choice is
  kept in `shared("trailmix.sort")`, so it survives restarts and every copy follows it.
- Clicking a row opens a dialog (70% × 80%) with the trail's `report.md` rendered as Markdown,
  else its `brief.md`, frontmatter stripped. With both, Brief / Report tabs switch between them.
  ✕ or Esc closes it. A missing file says "… not found"; an unreadable one shows the error.
- When a trail reaches a checkpoint and no agent in its space is `working`, an info toast
  "<title> needs you" fires once; clicking it selects the space. It never fires for trails already
  waiting when the panel starts, and fires again only after the trail moves on and comes back.
  An agent that's `working` holds the toast until it stops (checked at the next refresh).
- Refreshes every 15 s; local spaces also refresh as soon as `.trailmix/trail` changes. Hover
  highlights a row. Read-only: it never changes a trail.
- Herdr docks the column only into a personal layout (Herdr's own are replaced on every start),
  the first time it sees the folder. Clone first: `herdr-app do layout.clone
  '{"name":"main","as":"trailmix"}'`, then copy the mod in.
- The header's `✕` hides the docked column (Herdr remembers it). The palette's "Trails" then
  offers "Show panel" to bring it back. A button beside Files/Changes would need a clone of
  Herdr's `tabs` mod, which hardcodes those two.
- The command palette's "Trails" opens the same list as a 360 × 520 overlay, for layouts
  without the docked column. It doesn't toast or watch folders; the docked copy does.

**Built from:** one mod, `mods/trailmix/`, docked by `mod.json` and reused as its own dialog
(`openOverlay({ mod: "trailmix", props: { doc } })`). For each distinct space folder it runs
trailmix's `trail.mjs status --json` *on that space's machine*:
`exec(node, ["--input-type=module", "-e", <loader>, "status", "--json"], { on: space.machine, cwd: space.folder, timeout: 10000 })`.
The loader imports `trail.mjs` from a `data:` URL built from `trail-source.js` (trail.mjs
embedded as a string), so nothing is installed on the machine. Uses `spaces`, `agents`, `exec`,
`readTextFile`, `watchFolder`, `notify`, `openOverlay`, `closeOverlay`, `props`, `theme`,
`checking`; `TextView.markdown` for the reader; `space.select` from the toast. `logic.js` holds
the pure parts (loader, `node` lookup, parsing, errors, grouping, notifications).

**Watch out:**
- Needs Node ≥ 16 on every machine with trails. `exec` doesn't start a login shell, so a node
  from a version manager is often not on its `PATH`. With no `node` setting, the mod then retries
  through `sh`, which takes the first of `command -v node`, volta, mise, asdf, fnm's default, and
  the highest nvm version (not nvm's `default` alias; a custom `NVM_DIR` or fnm's macOS folder
  isn't searched, and a stale shim wins over nvm). A machine that needed `sh` goes straight to it
  on later refreshes. Only when that finds nothing (or the machine has no `sh`, e.g.
  Windows) does the row read "node not found on <machine> — set the `node` setting". The setting
  is the `node` prop on the mod's block in `layouts/<name>.json`:
  `{ "mod": "trailmix", "props": { "node": "/abs/path/to/node" } }`, or per machine
  `{ "node": { "local": "/usr/bin/node", "my-vm": "/home/me/.nvm/versions/node/v24.0.0/bin/node" } }`
  (unlisted machines use `node`). A set path is used as-is, with no fallback.
- The command line carries trail.mjs (~22 KB, only `%#?` and line breaks escaped for the `data:`
  URL) per folder per refresh; a test keeps it under Windows' 32,767-character limit.
- Embedded HTML in a brief or report shows as text (`raw_html(false)`).
- `watchFolder` is local only; remote spaces update on the 15 s poll, which pauses while the
  window is hidden and catches up when it shows.
- Spaces without a folder are skipped.
- `trail-source.js` is generated; rebuild it from trailmix rather than editing it.

**Done when:** `herdr-app check ~/.config/herdr-app/mods/trailmix` passes; a space with a trail
in progress lists it with the right next step; a remote space's trails show too; clicking a
trail shows its report (or brief) without the frontmatter; approving a brief or report in a
terminal updates the row within 15 s; a trail reaching sign-off while its agent is idle raises
one toast that selects the space.
