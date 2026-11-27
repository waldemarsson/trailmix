// Trails: every space's trailmix trails in a side panel. Click a trail to read its brief/report
// and approve, drop, reopen or delete it; a toast when a trail waits on you. Opened as an overlay
// with props { doc } it is the reader. trail.mjs runs on the space's machine through exec; every
// change is a trail.mjs op, so the mod never writes trail files itself.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { spaces, agents, exec, readTextFile, watchFolder, notify, openOverlay, closeOverlay, props, theme, checking, window, shared, setShared, layout, run } from "herdr";
import SOURCE from "./trail-source.js";
import { nodeFor, statusArgs, actionArgs, parseShellStatus, parseAction, actionsFor, stillApplies, confirmStep, createChangeWatch, pillFor, cardFor, viaShell, cannotStart, execError, groupTrails, tally, findDock, relocate, stripFrontmatter, createNotifier, toastFor, machineLabel } from "./logic.js";

const POLL_MS = 15000;
const NARROW = 160; // narrower than this (a folded sidebar), draw the rail: Herdr's sidebar threshold
const HEADER = 36; // a collapsed sidebar section is just its header
const SHIPPED = ["main", "terminals", "win98"]; // Herdr's own layouts; layout.set can't add blocks there
const SORT_KEY = "trailmix.sort"; // "space" (sidebar order) or "priority"; shared so every copy follows
const VIEW_KEY = "trailmix.view"; // "open" or "closed" (done + dropped)
const CHANGED_KEY = "trailmix.changed"; // { machine, folder, nonce }: the reader changed a trail there
const TIMEOUT_MS = 10000;
const keyOf = (s) => `${machineLabel(s.machine)}\0${s.folder}`;

// trail.mjs on the folder's machine. exec doesn't start a login shell, so with no `node` setting a
// failed start retries through sh; `viaSh` remembers machines that needed it. `parse` maps the
// result (direct or through sh) to { …, error? }.
async function runTrail(args, { machine, folder, setting, viaSh }, parse) {
  const node = nodeFor(setting, machine);
  const opts = { on: machine, cwd: folder, timeout: TIMEOUT_MS };
  const label = machineLabel(machine);
  const memo = node === "node" && viaSh.has(label); // a node setting added later wins
  const sh = async () => parse(await exec("sh", viaShell(args), opts), machine);
  try {
    return memo ? await sh() : parse(await exec(node, args, opts), machine);
  } catch (err) {
    try {
      if (node !== "node" || memo || !cannotStart(err, node)) throw err;
      const res = await sh();
      if (!res.error) viaSh.add(label);
      return res;
    } catch (err) {
      return { error: execError(err, { machine, node }) };
    }
  }
}

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
    this.changes = createChangeWatch(shared(CHANGED_KEY));
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
      const res = await runTrail(statusArgs(SOURCE), { machine: e.machine, folder: e.folder, setting: props()?.node, viaSh: this.viaSh }, parseShellStatus);
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
      // The reader runs trail.mjs too: hand it this copy's node setting and sh memo.
      props: { doc: { machine: space.machine ?? null, folder: space.folder, slug: trail.slug, title: trail.title || trail.slug,
        node: props()?.node, viaSh: this.viaSh.has(machineLabel(space.machine)) } },
    });
  }

  // ---- reader overlay --------------------------------------------------------------------------

  initDoc(doc, cx) {
    this.doc = doc;
    this.files = {}; // name -> markdown | null (absent) | { error }
    this.target = { machine: doc.machine, folder: doc.folder, setting: doc.node, viaSh: new Set(doc.viaSh ? [machineLabel(doc.machine)] : []) };
    this.armed = null; // "delete" after its first click
    this.busy = null; // the op running
    this.note = null; // the last error
    this.overlayId = props()?.overlay; // read now: props() inside a later task isn't guaranteed to be this copy's
    if (checking()) return;
    cx.spawn(async (cx) => {
      this.note = await this.reloadDoc();
      cx.notify();
    });
  }

  // The trail's files and its status (which picks the buttons); a fresh status disarms delete.
  // Returns the status error, if any, as the line to show. `res`: a status just fetched, to reuse.
  async reloadDoc(res) {
    const doc = this.doc;
    const dir = `${doc.folder}/.trailmix/trail/${doc.slug}`;
    for (const f of ["report.md", "brief.md"]) {
      try {
        const text = await readTextFile(`${dir}/${f}`, { on: doc.machine });
        this.files[f] = text === null ? null : stripFrontmatter(text);
      } catch (err) {
        this.files[f] = { error: String(err?.message ?? err) };
      }
    }
    if (!this.which || this.files[this.which] == null) this.which = this.files["report.md"] != null ? "report.md" : "brief.md";
    res ??= await this.trailStatus();
    if (!res.error) return null;
    if (this.files["report.md"] !== null || this.files["brief.md"] !== null) return res.error;
    this.trail = null;
    return "Trail not found or unreachable";
  }

  async trailStatus() {
    const res = await runTrail(statusArgs(SOURCE, this.doc.slug), this.target, parseShellStatus);
    if (!res.error) this.trail = res.trails[0] ?? null; // on error keep the buttons: each click rechecks first
    this.armed = null;
    return res;
  }

  act(op, cx) {
    if (this.busy) return;
    const step = confirmStep(this.armed, op);
    this.armed = step.armed;
    this.note = null;
    if (!step.run) return cx.notify();
    this.busy = op;
    cx.notify();
    cx.spawn(async (cx) => {
      const doc = this.doc;
      const fresh = await this.trailStatus();
      if (fresh.error) this.note = await this.reloadDoc(fresh);
      else if (!stillApplies(op, this.trail)) this.note = (await this.reloadDoc()) ?? "Trail changed meanwhile — buttons updated";
      else {
        const res = await runTrail(actionArgs(SOURCE, op, doc.slug), this.target, parseAction);
        // Tell the panel either way: a failed op may still have changed something.
        setShared(CHANGED_KEY, { machine: doc.machine, folder: doc.folder, nonce: `${Date.now()}-${Math.random()}` });
        if (!res.error && op === "delete") return void closeOverlay(this.overlayId);
        const err = await this.reloadDoc();
        this.note = res.error ?? err;
      }
      this.busy = null;
      cx.notify();
    });
  }

  actionBar(t) {
    if (!this.trail) return [];
    return actionsFor(this.trail).map(({ op, label }) => {
      const armed = this.armed === op;
      const danger = op === "delete";
      const color = armed ? t.ansi1 : danger ? t.muted : t.foreground;
      return div().id(`doc-act-${op}`).px(8).py(2).flex_none().rounded(6).border_1().text_size(12)
        .border_color(armed ? t.ansi1 : t.border).text_color(this.busy ? t.dim : color)
        .when(!this.busy, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click((_e, cx) => this.act(op, cx)))
        .child(this.busy === op ? "…" : armed ? "Confirm delete?" : label);
    });
  }

  renderDoc(t) {
    const doc = this.doc;
    const both = this.files["report.md"] != null && this.files["brief.md"] != null;
    const body = this.which ? this.files[this.which] : undefined;
    const tab = (f, label) =>
      div().id(`doc-tab-${f}`).px(8).py(2).rounded(6).cursor_pointer().text_size(12)
        .text_color(this.which === f ? t.foreground : t.muted).when(this.which === f, (el) => el.bg(t.raised)).hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => { this.which = f; this.armed = null; cx.notify(); })
        .child(label);
    return v_flex().id("trailmix-doc").size_full().min_h(0).rounded(8).bg(t.popover).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().flex_1().min_w(0).truncate().font_semibold().child(doc.title))
        .when(both, (el) => el.child(tab("brief.md", "Brief")).child(tab("report.md", "Report")))
        .children(this.actionBar(t))
        .child(div().id("doc-close").px(6).cursor_pointer().text_color(t.muted).hover((s) => s.text_color(t.foreground))
          .on_click(() => closeOverlay(this.overlayId)).child("✕")))
      .when(Boolean(this.note), (el) => el.child(div().px(14).py(4).flex_none().border_b(1).border_color(t.border).text_size(12).text_color(t.ansi1).child(this.note ?? "")))
      .child(v_flex().id("doc-body").flex_1().min_h(0).overflow_y_scrollbar().p(16)
        .child(body === undefined ? div().text_color(t.dim).child("Loading…")
          : body === null ? div().text_color(t.dim).child(`${this.which} not found`)
          : typeof body === "object" ? div().text_color(t.ansi1).child(`Cannot read ${this.which}: ${body.error}`)
          : TextView.markdown(`doc-${doc.slug}-${this.which}`, body).raw_html(false)));
  }

  // ---- panel -----------------------------------------------------------------------------------

  // One card per space with open trails or an error; spaces with only finished trails collapse
  // into one line at the bottom.
  // The Closed view lists done and dropped trails the same way, with no summary line.
  rows(t, priority, closedView) {
    const cards = [];
    const fin = { spaces: 0, done: 0, dropped: 0 };
    for (const s of spaces()) {
      const e = s.folder ? this.folders.get(keyOf(s)) : undefined;
      if (!e || (!e.error && !e.trails?.length)) continue;
      const { list, show, counts, rank, done, dropped } = cardFor(e.trails, e.error, { closedView, priority });
      if (!show) {
        if (closedView) continue;
        fin.spaces++;
        fin.done += done;
        fin.dropped += dropped;
        continue;
      }
      cards.push({ rank, el: v_flex().id(`space-${s.id}`).flex_none().p(8).gap(2).rounded(8).border_1().border_color(t.border).bg(t.surface)
        .child(h_flex().gap(6).items_center().pb(2)
          .child(div().flex_1().min_w(0).truncate().text_size(12).font_semibold().child(s.name))
          .when(Boolean(counts), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(counts)))
          .when(s.machine != null, (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.hover).text_size(10).text_color(t.muted).child(s.machine))))
        .when(Boolean(e.error), (el) => el.child(div().px(2).text_size(12).text_color(t.ansi1).child(e.error ?? "")))
        .children(list.map((tr) => {
          const pill = pillFor(tr);
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

  open() {
    const open = [];
    for (const s of spaces()) {
      const e = s.folder ? this.folders.get(keyOf(s)) : undefined;
      if (e?.trails) open.push(...groupTrails(e.trails).open);
    }
    return open;
  }

  badges(t, ids) {
    const { waiting, building } = tally(this.open());
    const badge = (n, c, tip) => h_flex().id(`${ids}-${tip}`).min_w(22).h(18).px(4).flex_none().justify_center().items_center().rounded(9)
      .border_1().border_color(c).text_color(c).text_size(11).tooltip(`${n} ${tip}`).child(String(n));
    return [waiting > 0 && badge(waiting, t.blocked, "waiting on you"), building > 0 && badge(building, t.working, "building")].filter(Boolean);
  }

  button(t, id, label, tip, click) {
    return h_flex().id(id).ml(4).px(6).py(1).flex_none().rounded(4).cursor_pointer().text_size(11).text_color(t.muted)
      .hover((st) => st.bg(t.hover).text_color(t.foreground)).when(Boolean(tip), (el) => el.tooltip(tip)).on_click(click).child(label);
  }

  // Outside the sidebar (palette overlay, an old right column): offer to pin it under Agents.
  pinButton(t, root, dock) {
    if (dock?.inSidebar && !dock.hidden) return null;
    if (SHIPPED.includes(shared("layout"))) {
      return this.overlay ? div().ml(4).flex_none().text_size(11).text_color(t.dim).child("Clone the layout to pin") : null;
    }
    const pinned = relocate(root, "trailmix", "sidebar");
    if (!pinned) return null;
    return this.button(t, "trailmix-pin", this.overlay ? "Pin to sidebar" : "⇤", "Show under Spaces and Agents", () => {
      run("layout.set", { layout: pinned });
      if (this.overlay) closeOverlay(props().overlay);
    });
  }

  // A folded sidebar: icon and counts; a click opens the list as the palette overlay.
  renderRail(t) {
    return v_flex().id("trailmix").on_size_change((size, cx) => this.sized(size, cx))
      .size_full().items_center().pt(10).gap(8).cursor_pointer().hover((st) => st.bg(t.hover))
      .tooltip("Trails — click to open").on_click(() => run("mod.open", { name: "trailmix" }))
      .child(svg("mods/trailmix/trail.svg").size(18).text_color(t.muted))
      .children(this.badges(t, "rail"));
  }

  sized(size, cx) {
    if (size.width === this.width && size.height === this.height) return;
    this.width = size.width;
    this.height = size.height;
    cx.notify();
  }

  render(cx) {
    const t = theme();
    if (this.doc) return this.renderDoc(t);
    const changed = this.changes.observe(shared(CHANGED_KEY));
    if (changed && !checking()) for (const e of this.folders.values()) if (e.machine === changed.machine && e.folder === changed.folder) this.load(e, cx);
    if (!this.overlay && this.width < NARROW) return this.renderRail(t);
    if (!checking() && window()?.visible !== false && Date.now() - this.refreshed > POLL_MS) this.refresh(cx);
    const root = layout(), dock = findDock(root, "trailmix");
    const side = !this.overlay && dock?.inSidebar === true;
    const collapsed = side && this.height < HEADER + 12;
    const priority = shared(SORT_KEY) === "priority";
    const sort = div().id("trailmix-sort").px(6).py(1).flex_none().rounded(4).cursor_pointer().text_size(11).text_color(t.muted)
      .hover((st) => st.bg(t.hover).text_color(t.foreground))
      .on_click(() => setShared(SORT_KEY, priority ? "space" : "priority"))
      .child(priority ? "↓ Priority" : "↓ Space order");
    const closedView = shared(VIEW_KEY) === "closed";
    const toggle = div().id("trailmix-view").px(6).py(1).flex_none().rounded(4).cursor_pointer().text_size(11).text_color(t.muted)
      .hover((st) => st.bg(t.hover).text_color(t.foreground)).tooltip(closedView ? "Show open trails" : "Show done and dropped trails")
      .on_click(() => setShared(VIEW_KEY, closedView ? "open" : "closed"))
      .child(closedView ? "Closed" : "Open");
    const pin = this.pinButton(t, root, dock);
    const title = side
      ? h_flex().id("trailmix-fold").flex_1().min_w(0).gap(6).items_center().cursor_pointer()
        .tooltip(collapsed ? "Expand" : "Collapse")
        .on_click(() => run("layout.resize", collapsed ? { id: dock.id, weight: 1 } : { id: dock.id, px: HEADER }))
        .child(div().w(10).flex_none().text_color(t.muted).child(collapsed ? "▸" : "▾"))
        .child(div().font_semibold().child("Trails"))
        .children(collapsed ? this.badges(t, "head") : [])
      : div().flex_1().font_semibold().child("Trails");
    const header = h_flex().h(HEADER).flex_none().px(12).items_center().when(!collapsed, (el) => el.border_b(1).border_color(t.border))
      .child(title)
      .when(!collapsed, (el) => el.child(toggle).child(sort))
      .when(side && !collapsed, (el) => el.child(this.button(t, "trailmix-remove", "✕", "Remove from the sidebar",
        () => { const out = relocate(root, "trailmix", null); if (out) run("layout.set", { layout: out }); })))
      .when(Boolean(pin), (el) => el.child(pin));
    const view = v_flex().id("trailmix").on_size_change((size, cx) => this.sized(size, cx)).size_full().min_h(0)
      .when(!side, (el) => el.bg(t.background)).text_color(t.foreground).text_size(13).child(header);
    if (collapsed) return view;
    const rows = this.rows(t, priority, closedView);
    const loading = [...this.folders.values()].some((e) => !e.trails && !e.error);
    return view.child(v_flex().id("trailmix-list").flex_1().min_h(0).overflow_y_scrollbar().p(6).gap(6)
      .children(rows)
      .when(!rows.length, (el) => el.child(div().p(6).text_size(12).text_color(t.dim).child(loading ? "Loading trails…" : closedView ? "No closed trails" : "No trails in any space"))));
  }
}
