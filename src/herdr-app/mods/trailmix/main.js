// Trails: every space's trailmix trails in a side panel. Click a trail to read its brief/report;
// a toast when a trail waits on you. Opened as an overlay with props { doc } it is the reader.
// trail.mjs runs on the space's machine through exec; the mod never writes trail files.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { spaces, agents, exec, readTextFile, watchFolder, notify, openOverlay, closeOverlay, props, theme, checking, window, shared, setShared, layout, run } from "herdr";
import SOURCE from "./trail-source.js";
import { nodeFor, statusArgs, parseStatus, parseShellStatus, viaShell, cannotStart, execError, groupTrails, statusPill, trailRank, spaceRank, tally, findDock, relocate, stripFrontmatter, createNotifier, toastFor, machineLabel } from "./logic.js";

const POLL_MS = 15000;
const RAIL = 44; // collapsed width, like Herdr's sidebar rail
const NARROW = 160; // narrower than this, draw the rail (Herdr's sidebar threshold)
const WIDE = 280; // mod.json size; expand target when no width was remembered
const SORT_KEY = "trailmix.sort"; // "space" (sidebar order) or "priority"; shared so every copy follows
const TIMEOUT_MS = 10000;
const keyOf = (s) => `${machineLabel(s.machine)}\0${s.folder}`;

export default class Trails extends View {
  init(_props, cx) {
    const doc = props()?.doc;
    if (doc) return this.initDoc(doc, cx);
    this.folders = new Map(); // machine+folder -> { machine, folder, trails?, error?, busy, again, watch, gone }
    this.notifier = createNotifier();
    // The palette's overlay is a second copy in front of you: leave toasts and watchers to the docked one.
    this.overlay = Boolean(props()?.overlay);
    this.viaSh = new Set(); // machines whose node is only found through sh
    this.refreshed = 0;
    if (checking()) return;
    // Each poll spawns node per folder, so skip it while the window is hidden; render catches up.
    cx.timer.every(POLL_MS, (cx) => window()?.visible !== false && this.refresh(cx));
    this.refresh(cx);
  }

  async close() {
    for (const e of this.folders?.values() ?? []) {
      e.gone = true;
      e.watch?.pending?.cancel();
    }
  }

  // Reconcile with the live spaces: drop removed folders (and their watchers), load the rest.
  refresh(cx) {
    this.refreshed = Date.now();
    const live = new Map();
    for (const s of spaces()) if (s.folder && !live.has(keyOf(s))) live.set(keyOf(s), { machine: s.machine ?? null, folder: s.folder });
    for (const [k, e] of this.folders) {
      if (live.has(k)) continue;
      e.gone = true;
      e.watch?.pending?.cancel();
      this.folders.delete(k);
    }
    for (const [k, info] of live) {
      if (!this.folders.has(k)) this.folders.set(k, { ...info });
      this.load(this.folders.get(k), cx);
    }
  }

  load(e, cx) {
    if (e.busy) return void (e.again = true); // never overlap; rerun once the current one lands
    e.busy = true;
    cx.spawn(async (cx) => {
      const node = nodeFor(props()?.node, e.machine);
      const opts = { on: e.machine, cwd: e.folder, timeout: TIMEOUT_MS };
      const label = machineLabel(e.machine);
      const memo = node === "node" && this.viaSh.has(label); // a node setting added later wins
      const viaSh = async () => parseShellStatus(await exec("sh", viaShell(statusArgs(SOURCE)), opts), e.machine);
      let res;
      try {
        res = memo ? await viaSh() : parseStatus(await exec(node, statusArgs(SOURCE), opts));
      } catch (err) {
        try {
          if (node !== "node" || memo || !cannotStart(err, node)) throw err;
          res = await viaSh();
          if (res.trails) this.viaSh.add(label);
        } catch (err) {
          res = { error: execError(err, { machine: e.machine, node }) };
        }
      }
      e.busy = false;
      if (e.gone) return;
      e.trails = res.trails;
      e.error = res.error;
      if (e.trails && !this.overlay) {
        this.toast(e);
        this.watch(e, cx);
      }
      cx.notify();
      if (e.again) {
        e.again = false;
        this.load(e, cx);
      }
    });
  }

  toast(e) {
    const here = spaces().filter((s) => s.folder === e.folder && (s.machine ?? null) === e.machine);
    if (!here.length) return;
    const ids = new Set(here.map((s) => s.id));
    const working = agents().some((a) => ids.has(a.space) && a.status === "working");
    for (const t of this.notifier.observe({ machine: e.machine, folder: e.folder, trails: e.trails, working })) notify(toastFor(t, here[0]));
  }

  // Local folders only (watchFolder can't watch another machine); the poll covers the rest.
  // A missing .trailmix/trail rejects; the next poll tries again.
  watch(e, cx) {
    if (e.machine !== null || e.watch) return;
    const w = (e.watch = {});
    cx.spawn(async (cx) => {
      try {
        while (!e.gone && e.watch === w) {
          w.pending = watchFolder(`${e.folder}/.trailmix/trail`);
          const paths = await w.pending;
          if (!paths.length) break; // cancelled or reclaimed
          if (!e.gone) this.load(e, cx);
        }
      } catch {}
      if (e.watch === w) e.watch = null;
    });
  }

  openDoc(space, trail) {
    openOverlay({
      mod: "trailmix",
      kind: "dialog",
      width: 0.7,
      height: 0.8,
      props: { doc: { machine: space.machine ?? null, folder: space.folder, slug: trail.slug, title: trail.title || trail.slug } },
    });
  }

  // ---- reader overlay --------------------------------------------------------------------------

  initDoc(doc, cx) {
    this.doc = doc;
    this.files = {}; // name -> markdown | null (absent) | { error }
    cx.spawn(async (cx) => {
      const dir = `${doc.folder}/.trailmix/trail/${doc.slug}`;
      for (const f of ["report.md", "brief.md"]) {
        try {
          const text = await readTextFile(`${dir}/${f}`, { on: doc.machine });
          this.files[f] = text === null ? null : stripFrontmatter(text);
        } catch (err) {
          this.files[f] = { error: String(err?.message ?? err) };
        }
      }
      this.which = this.files["report.md"] != null ? "report.md" : "brief.md";
      cx.notify();
    });
  }

  renderDoc(t) {
    const doc = this.doc;
    const both = this.files["report.md"] != null && this.files["brief.md"] != null;
    const body = this.which ? this.files[this.which] : undefined;
    const tab = (f, label) =>
      div().id(`doc-tab-${f}`).px(8).py(2).rounded(6).cursor_pointer().text_size(12)
        .text_color(this.which === f ? t.foreground : t.muted).when(this.which === f, (el) => el.bg(t.raised)).hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => { this.which = f; cx.notify(); })
        .child(label);
    return v_flex().id("trailmix-doc").size_full().min_h(0).rounded(8).bg(t.popover).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().flex_1().min_w(0).truncate().font_semibold().child(doc.title))
        .when(both, (el) => el.child(tab("brief.md", "Brief")).child(tab("report.md", "Report")))
        .child(div().id("doc-close").px(6).cursor_pointer().text_color(t.muted).hover((s) => s.text_color(t.foreground))
          .on_click(() => closeOverlay(props().overlay)).child("✕")))
      .child(v_flex().id("doc-body").flex_1().min_h(0).overflow_y_scrollbar().p(16)
        .child(body === undefined ? div().text_color(t.dim).child("Loading…")
          : body === null ? div().text_color(t.dim).child(`${this.which} not found`)
          : typeof body === "object" ? div().text_color(t.ansi1).child(`Cannot read ${this.which}: ${body.error}`)
          : TextView.markdown(`doc-${doc.slug}-${this.which}`, body).raw_html(false)));
  }

  // ---- panel -----------------------------------------------------------------------------------

  // One card per space with open trails or an error; spaces with only finished trails collapse
  // into one line at the bottom.
  rows(t, priority) {
    const cards = [];
    const fin = { spaces: 0, done: 0, dropped: 0 };
    for (const s of spaces()) {
      const e = s.folder ? this.folders.get(keyOf(s)) : undefined;
      if (!e || (!e.error && !e.trails?.length)) continue;
      const { open, done, dropped } = e.trails ? groupTrails(e.trails) : { open: [], done: 0, dropped: 0 };
      if (!e.error && !open.length) {
        fin.spaces++;
        fin.done += done;
        fin.dropped += dropped;
        continue;
      }
      if (priority) open.sort((a, b) => trailRank(a.next) - trailRank(b.next));
      const counts = [done && `${done} done`, dropped && `${dropped} dropped`].filter(Boolean).join(" · ");
      cards.push({ rank: spaceRank(open, e.error), el: v_flex().id(`space-${s.id}`).flex_none().p(8).gap(2).rounded(8).border_1().border_color(t.border).bg(t.surface)
        .child(h_flex().gap(6).items_center().pb(2)
          .child(div().flex_1().min_w(0).truncate().text_size(12).font_semibold().child(s.name))
          .when(Boolean(counts), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(counts)))
          .when(s.machine != null, (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.hover).text_size(10).text_color(t.muted).child(s.machine))))
        .when(Boolean(e.error), (el) => el.child(div().px(2).text_size(12).text_color(t.ansi1).child(e.error ?? "")))
        .children(open.map((tr) => {
          const pill = statusPill(tr.next);
          const color = t[pill.tone] ?? t.muted;
          return v_flex().id(`trail-${s.id}-${tr.slug}`).px(6).py(4).gap(3).rounded(6).cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click(() => this.openDoc(s, tr))
            .child(div().truncate().child(tr.title || tr.slug))
            .child(h_flex().child(div().px(6).rounded(4).border_1().border_color(color).text_size(11).text_color(color).child(pill.label)));
        })) });
    }
    if (priority) cards.sort((a, b) => a.rank - b.rank);
    const out = cards.map((c) => c.el);
    if (fin.spaces) {
      const line = [`${fin.spaces} ${fin.spaces === 1 ? "space" : "spaces"}`, fin.done && `${fin.done} done`, fin.dropped && `${fin.dropped} dropped`];
      out.push(div().px(6).py(2).text_size(11).text_color(t.dim).child(line.filter(Boolean).join(" · ")));
    }
    return out;
  }

  // Docked: move between the sidebar and a right column; » folds the right column to a rail.
  // Palette overlay: "Show panel" brings a hidden column back.
  dockButtons(t) {
    const root = layout(), dock = findDock(root, "trailmix");
    if (!dock || dock.hidden !== this.overlay) return [];
    const btn = (id, label, tip, click) => h_flex().id(id).ml(4).px(6).py(1).rounded(4).cursor_pointer().text_size(11).text_color(t.muted)
      .hover((st) => st.bg(t.hover).text_color(t.foreground)).when(Boolean(tip), (el) => el.tooltip(tip)).on_click(click).child(label);
    if (this.overlay) return [btn("trailmix-show", "Show panel", null, () => { run("layout.show", { id: dock.id }); closeOverlay(props().overlay); })];
    const where = dock.inSidebar ? "right" : "sidebar";
    const moved = relocate(root, "trailmix", where);
    const out = [];
    if (moved) {
      out.push(btn("trailmix-move", dock.inSidebar ? "⇥" : "⇤", dock.inSidebar ? "Move to a column on the right" : "Move to the sidebar, under Agents",
        () => run("layout.set", { layout: moved })));
    }
    if (!dock.inSidebar) {
      out.push(btn("trailmix-fold", "»", "Fold to a rail", () => {
        if (this.width >= NARROW) localStorage.setItem("width", String(Math.round(this.width)));
        run("layout.resize", { id: dock.id, px: RAIL });
      }));
    }
    return out;
  }

  renderRail(t) {
    const open = [];
    for (const s of spaces()) {
      const e = s.folder ? this.folders.get(keyOf(s)) : undefined;
      if (e?.trails) open.push(...groupTrails(e.trails).open);
    }
    const { waiting, building } = tally(open);
    const badge = (n, c, tip) => h_flex().id(`rail-${tip}`).min_w(22).h(18).px(4).justify_center().items_center().rounded(9)
      .border_1().border_color(c).text_color(c).text_size(11).tooltip(`${n} ${tip}`).child(String(n));
    const dock = findDock(layout(), "trailmix");
    return v_flex().id("trailmix").on_size_change((size, cx) => this.sized(size, cx))
      .size_full().items_center().pt(10).gap(8).bg(t.background).cursor_pointer().hover((st) => st.bg(t.hover))
      .tooltip(dock?.inSidebar ? "Trails — click to open" : "Trails — click to expand")
      // In a folded sidebar the rail can't widen itself; open the list as the palette overlay.
      .on_click(() => {
        if (!dock || dock.inSidebar) run("mod.open", { name: "trailmix" });
        else run("layout.resize", { id: dock.id, px: Number(localStorage.getItem("width")) || WIDE });
      })
      .child(svg("mods/trailmix/trail.svg").size(18).text_color(t.muted))
      .when(waiting > 0, (el) => el.child(badge(waiting, t.blocked, "waiting on you")))
      .when(building > 0, (el) => el.child(badge(building, t.working, "building")));
  }

  sized(size, cx) {
    if (size.width === this.width) return;
    this.width = size.width;
    cx.notify();
  }

  render(cx) {
    const t = theme();
    if (this.doc) return this.renderDoc(t);
    if (!this.overlay && this.width < NARROW) return this.renderRail(t);
    if (!checking() && window()?.visible !== false && Date.now() - this.refreshed > POLL_MS) this.refresh(cx);
    const priority = shared(SORT_KEY) === "priority";
    const rows = this.rows(t, priority);
    const dockBtns = this.dockButtons(t);
    const loading = [...this.folders.values()].some((e) => !e.trails && !e.error);
    return v_flex().id("trailmix").on_size_change((size, cx) => this.sized(size, cx)).size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13)
      .child(h_flex().h(36).flex_none().px(12).items_center().border_b(1).border_color(t.border)
        .child(div().flex_1().font_semibold().child("Trails"))
        .child(div().id("trailmix-sort").px(6).py(1).rounded(4).cursor_pointer().text_size(11).text_color(t.muted)
          .hover((st) => st.bg(t.hover).text_color(t.foreground))
          .on_click(() => setShared(SORT_KEY, priority ? "space" : "priority"))
          .child(priority ? "↓ Priority" : "↓ Space order"))
        .children(dockBtns))
      .child(v_flex().id("trailmix-list").flex_1().min_h(0).overflow_y_scrollbar().p(6).gap(6)
        .children(rows)
        .when(!rows.length, (el) => el.child(div().p(6).text_size(12).text_color(t.dim).child(loading ? "Loading trails…" : "No trails in any space"))));
  }
}
