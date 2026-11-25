// Trails: every space's trailmix trails in a side panel. Click a trail to read its brief/report;
// a toast when a trail waits on you. Opened as an overlay with props { doc } it is the reader.
// trail.mjs runs on the space's machine through exec; the mod never writes trail files.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { spaces, agents, exec, readTextFile, watchFolder, notify, openOverlay, closeOverlay, props, theme, checking } from "herdr";
import SOURCE from "./trail-source.js";
import { nodeFor, statusArgs, parseStatus, execError, groupTrails, isCheckpoint, stripFrontmatter, createNotifier, toastFor, machineLabel } from "./logic.js";

const POLL_MS = 15000;
const TIMEOUT_MS = 10000;
const keyOf = (s) => `${machineLabel(s.machine)}\0${s.folder}`;
// Module scope is shared by every copy, so two docked copies still toast once.
const notifier = createNotifier();

export default class Trails extends View {
  init(_props, cx) {
    const doc = props()?.doc;
    if (doc) return this.initDoc(doc, cx);
    this.folders = new Map(); // machine+folder -> { machine, folder, trails?, error?, busy, again, watch, gone }
    if (checking()) return;
    cx.timer.every(POLL_MS, (cx) => this.refresh(cx));
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
      let res;
      try {
        res = parseStatus(await exec(node, statusArgs(SOURCE), { on: e.machine, cwd: e.folder, timeout: TIMEOUT_MS }));
      } catch (err) {
        res = { error: execError(err, { machine: e.machine, node }) };
      }
      e.busy = false;
      if (e.gone) return;
      e.trails = res.trails;
      e.error = res.error;
      if (e.trails) {
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
    for (const t of notifier.observe({ machine: e.machine, folder: e.folder, trails: e.trails, working })) notify(toastFor(t, here[0]));
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
          : TextView.markdown(`doc-${doc.slug}-${this.which}`, body)));
  }

  // ---- panel -----------------------------------------------------------------------------------

  rows(t) {
    const out = [];
    for (const s of spaces()) {
      const e = s.folder ? this.folders.get(keyOf(s)) : undefined;
      if (!e || (!e.error && !e.trails?.length)) continue;
      out.push(h_flex().id(`space-${s.id}`).pt(8).pb(2).px(6).gap(6).text_size(11).text_color(t.dim)
        .child(div().flex_1().min_w(0).truncate().font_semibold().child(s.name))
        .when(s.machine != null, (el) => el.child(div().child(s.machine))));
      if (e.error) {
        out.push(div().px(6).py(2).text_size(12).text_color(t.ansi1).child(e.error));
        continue;
      }
      const { open, done, dropped } = groupTrails(e.trails);
      for (const tr of open) {
        const cp = isCheckpoint(tr.next);
        out.push(v_flex().id(`trail-${s.id}-${tr.slug}`).px(6).py(4).rounded(6).cursor_pointer().hover((st) => st.bg(t.hover))
          .on_click(() => this.openDoc(s, tr))
          .child(h_flex().gap(6).items_center()
            .child(div().w(6).h(6).rounded(3).flex_none().bg(cp ? t.blocked : t.border))
            .child(div().flex_1().min_w(0).truncate().child(tr.title || tr.slug)))
          .child(div().pl(12).truncate().text_size(11).text_color(cp ? t.blocked : t.muted).child(tr.next)));
      }
      const counts = [done && `${done} done`, dropped && `${dropped} dropped`].filter(Boolean).join(" · ");
      if (counts) out.push(div().px(6).py(2).text_size(11).text_color(t.dim).child(counts));
    }
    return out;
  }

  render(_cx) {
    const t = theme();
    if (this.doc) return this.renderDoc(t);
    const rows = this.rows(t);
    const loading = [...this.folders.values()].some((e) => !e.trails && !e.error);
    return v_flex().id("trailmix").size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13)
      .child(h_flex().h(36).flex_none().px(12).items_center().border_b(1).border_color(t.border).child(div().font_semibold().child("Trails")))
      .child(v_flex().id("trailmix-list").flex_1().min_h(0).overflow_y_scrollbar().p(6).gap(1)
        .children(rows)
        .when(!rows.length, (el) => el.child(div().p(6).text_size(12).text_color(t.dim).child(loading ? "Loading trails…" : "No trails in any space"))));
  }
}
