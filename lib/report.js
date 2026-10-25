import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { TEAM } from "./team";
import { addDays, lagosDay, prettyDay, weekStart } from "./dates";

const COLORS = { brand: "#2858D8", ink: "#1E2430", faint: "#6B7280", line: "#E4E1D8", amber: "#C98A2B", green: "#15803D", red: "#B91C1C" };
const DAY = 86400000;

// The built-in PDF fonts only cover Latin-1 text. Swap smart punctuation and drop anything else.
function clean(s) {
  return String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[–—]/g, "-")
    .replace(/[^\n\x20-\x7E -ÿ]/g, "")
    .trim();
}
const clip = (s, n = 220) => (clean(s).length > n ? `${clean(s).slice(0, n)}...` : clean(s));
const ageDays = (iso, now) => Math.max(0, Math.floor((now - new Date(iso)) / DAY));

export function buildReportData(entries, now = new Date(), weekOffset = 0) {
  const start = weekStart(now, weekOffset);
  const end = addDays(start, 6);
  const inRange = (iso) => {
    const d = lagosDay(iso);
    return d >= start && d <= end;
  };
  const weekEntries = entries.filter((e) => inRange(e.createdAt));

  const people = TEAM.map((name) => {
    const mine = weekEntries.filter((e) => e.name === name);
    const asc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    return {
      name,
      dailies: mine.filter((e) => e.type === "Daily").sort(asc),
      weekly: mine.filter((e) => e.type === "Weekly").sort(asc),
      blockers: mine.filter((e) => e.type === "Blocker").sort(asc),
      days: new Set(mine.filter((e) => e.type !== "Blocker").map((e) => lagosDay(e.createdAt))),
    };
  });

  const byAge = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  const openBlockers = entries.filter((e) => e.type === "Blocker" && e.status !== "Resolved").sort(byAge);
  const decisions = entries.filter((e) => e.needsDecision && e.decisionStatus !== "Decided").sort(byAge);
  const resolved = entries.filter((e) => e.type === "Blocker" && e.status === "Resolved" && e.resolvedAt && inRange(e.resolvedAt));
  const decided = entries.filter((e) => e.needsDecision && e.decisionStatus === "Decided" && e.decidedAt && inRange(e.decidedAt));

  const data = { now, start, end, weekOffset, people, openBlockers, decisions, resolved, decided, weekEntryCount: weekEntries.length };
  data.actions = buildActions(data);
  return data;
}

function buildActions(d) {
  const out = [];
  for (const b of d.openBlockers) {
    const age = ageDays(b.createdAt, d.now);
    const how = age === 0 ? "today" : `${age}d open`;
    out.push(
      b.escalatedTo
        ? `Follow up with ${b.escalatedTo} on ${b.name}'s blocker (${how}): "${clip(b.blockers, 140)}"`
        : `Assign an owner to ${b.name}'s blocker (${how}, not escalated yet): "${clip(b.blockers, 140)}"`
    );
  }
  for (const e of d.decisions) {
    const age = ageDays(e.createdAt, d.now);
    out.push(`Decide: ${e.name} is waiting on "${clip(e.needsDecision, 140)}" (${age === 0 ? "today" : `${age}d waiting`})`);
  }
  const silent = d.people.filter((p) => p.days.size === 0).map((p) => p.name);
  if (silent.length) out.push(`Check in with ${silent.join(", ")}: nothing logged this week`);
  return out;
}

export function reportSubject(d) {
  return `Weekly report: ${prettyDay(d.start)} to ${prettyDay(d.end)}`;
}

export function reportFilename(d) {
  return `solosafe-weekly-report_${d.start}_to_${d.end}.pdf`;
}

export function reportEmailText(d, url) {
  const loggedCount = d.people.filter((p) => p.days.size > 0).length;
  const lines = [
    "Hi,",
    "",
    `Here is the Team Log report for ${prettyDay(d.start)} to ${prettyDay(d.end)}. The full PDF is attached.`,
    "",
    "WHERE THINGS STAND",
    `- ${loggedCount} of ${TEAM.length} team members logged this week (${d.weekEntryCount} entries).`,
    `- ${d.openBlockers.length} open blocker${d.openBlockers.length === 1 ? "" : "s"}; ${d.resolved.length} resolved this week.`,
    `- ${d.decisions.length} decision${d.decisions.length === 1 ? "" : "s"} waiting; ${d.decided.length} decided this week.`,
    "",
    "NEXT ACTIONS",
  ];
  if (d.actions.length === 0) lines.push("- Nothing outstanding. Good week.");
  for (const a of d.actions.slice(0, 10)) lines.push(`- ${clean(a)}`);
  if (d.actions.length > 10) lines.push(`- ...and ${d.actions.length - 10} more (see the PDF).`);
  lines.push("", `Open the log: ${url}`);
  return lines.join("\n");
}

export function renderReportPdf(d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: "SoloSafe Team Log - Weekly report", Author: "SoloSafe Team Log" } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 96;
    const need = (h) => {
      if (doc.y + h > doc.page.height - 70) doc.addPage();
    };
    const h2 = (text) => {
      need(60);
      doc.moveDown(0.9).font("Helvetica-Bold").fontSize(12).fillColor(COLORS.brand).text(text.toUpperCase(), 48, doc.y, { characterSpacing: 0.6 });
      doc.moveTo(48, doc.y + 3).lineTo(48 + W, doc.y + 3).lineWidth(0.6).strokeColor(COLORS.line).stroke();
      doc.moveDown(0.6);
    };
    const bullet = (text, color = COLORS.ink) => {
      const t = clean(text);
      need(doc.heightOfString(t, { width: W - 14 }) + 8);
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).fillColor(COLORS.faint).text("-", 48, y, { width: 10 });
      doc.fillColor(color).text(t, 62, y, { width: W - 14 });
      doc.moveDown(0.35);
    };
    const labeled = (label, text, color = COLORS.ink) => {
      if (!clean(text)) return;
      const t = clean(text);
      need(doc.heightOfString(`${label} ${t}`, { width: W - 14 }) + 6);
      doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.faint).text(`${label} `, 62, doc.y, { continued: true, width: W - 14 });
      doc.fillColor(color).text(t);
      doc.moveDown(0.2);
    };

    // Cover block
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.faint).text("CONFIDENTIAL", 48, 48, { characterSpacing: 1.2 });
    doc.font("Helvetica").fontSize(8.5).text("Prepared for SoloSafe");
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(20).fillColor(COLORS.ink).text("Weekly Team Log Report");
    doc.font("Helvetica").fontSize(11).fillColor(COLORS.faint).text(`${prettyDay(d.start)} to ${prettyDay(d.end)}`);
    doc.moveDown(0.4).fontSize(8.5).text(
      "SoloSafe is a personal safety platform designed to help people travel, explore, and move around with greater confidence through smart safety technology, emergency features, real-time protection, and trusted community tools.",
      { width: W }
    );

    // Snapshot
    h2("Where things stand");
    const loggedCount = d.people.filter((p) => p.days.size > 0).length;
    [
      `${loggedCount} of ${TEAM.length} team members logged this week (${d.weekEntryCount} entries).`,
      `${d.openBlockers.length} open blocker${d.openBlockers.length === 1 ? "" : "s"}; ${d.resolved.length} resolved this week.`,
      `${d.decisions.length} decision${d.decisions.length === 1 ? "" : "s"} waiting; ${d.decided.length} decided this week.`,
    ].forEach((t) => bullet(t));

    // Next actions
    h2("Next actions");
    if (d.actions.length === 0) bullet("Nothing outstanding.", COLORS.green);
    d.actions.forEach((a, i) => {
      const t = clean(a);
      need(doc.heightOfString(t, { width: W - 20 }) + 8);
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.brand).text(`${i + 1}.`, 48, y, { width: 18 });
      doc.font("Helvetica").fillColor(COLORS.ink).text(t, 68, y, { width: W - 20 });
      doc.moveDown(0.35);
    });

    // At a glance table
    h2("At a glance");
    const cols = [{ t: "Person", x: 48, w: 150 }, { t: "Days logged", x: 198, w: 80 }, { t: "Updates", x: 278, w: 70 }, { t: "Blockers raised", x: 348, w: 90 }, { t: "Decisions asked", x: 438, w: 90 }];
    need(30 + d.people.length * 18);
    let y = doc.y;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.faint);
    cols.forEach((c) => doc.text(c.t, c.x, y, { width: c.w }));
    y += 15;
    d.people.forEach((p) => {
      const asked = [...p.dailies, ...p.weekly].filter((e) => e.needsDecision).length;
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.ink).text(p.name, cols[0].x, y, { width: cols[0].w });
      doc.font("Helvetica").fillColor(p.days.size === 0 ? COLORS.red : COLORS.ink).text(`${p.days.size}/5`, cols[1].x, y, { width: cols[1].w });
      doc.fillColor(COLORS.ink).text(String(p.dailies.length + p.weekly.length), cols[2].x, y, { width: cols[2].w });
      doc.text(String(p.blockers.length), cols[3].x, y, { width: cols[3].w });
      doc.text(String(asked), cols[4].x, y, { width: cols[4].w });
      y += 16;
    });
    doc.y = y;

    // Open blockers
    h2(`Open blockers (${d.openBlockers.length})`);
    if (d.openBlockers.length === 0) bullet("None.", COLORS.green);
    d.openBlockers.forEach((b) => {
      const age = ageDays(b.createdAt, d.now);
      bullet(`${b.name} (${age === 0 ? "today" : `${age}d open`}): ${clip(b.blockers, 300)}${b.escalatedTo ? ` - escalated to ${b.escalatedTo}` : " - not escalated"}`, COLORS.ink);
    });

    // Decisions
    h2(`Decisions waiting (${d.decisions.length})`);
    if (d.decisions.length === 0) bullet("None.", COLORS.green);
    d.decisions.forEach((e) => bullet(`${e.name} (${ageDays(e.createdAt, d.now)}d): ${clip(e.needsDecision, 300)}`));

    // Wins
    if (d.resolved.length || d.decided.length) {
      h2("Closed this week");
      d.resolved.forEach((b) => bullet(`Blocker resolved - ${b.name}: ${clip(b.blockers, 200)}${b.resolvedBy ? ` (by ${clean(b.resolvedBy)})` : ""}`, COLORS.green));
      d.decided.forEach((e) => bullet(`Decision made - ${e.name}: ${clip(e.needsDecision, 200)}${e.decidedBy ? ` (by ${clean(e.decidedBy)})` : ""}`, COLORS.green));
    }

    // Per-person log
    h2("What each person logged");
    d.people.forEach((p) => {
      need(70);
      doc.moveDown(0.3).font("Helvetica-Bold").fontSize(11).fillColor(COLORS.ink).text(p.name, 48, doc.y, { continued: true });
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.faint).text(`   ${p.days.size}/5 days logged`);
      doc.moveDown(0.2);
      if (!p.dailies.length && !p.weekly.length && !p.blockers.length) {
        labeled("", "Nothing logged this week.", COLORS.faint);
        return;
      }
      p.weekly.forEach((e) => {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.brand).text("Weekly check-in", 62, doc.y);
        labeled("Completed:", e.completed);
        labeled("Next week:", e.planned);
        labeled("Blocked on:", e.blockers, COLORS.amber);
        labeled("Needs decision:", e.needsDecision, COLORS.amber);
      });
      p.dailies.forEach((e) => {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.faint).text(prettyDay(lagosDay(e.createdAt)), 62, doc.y);
        labeled("Completed:", e.completed);
        labeled("Next:", e.planned);
        labeled("Blocked on:", e.blockers, COLORS.amber);
      });
      p.blockers.forEach((b) => labeled(`Blocker (${b.status === "Resolved" ? "resolved" : "open"}):`, `${b.blockers}${b.escalatedTo ? ` - escalated to ${b.escalatedTo}` : ""}`, b.status === "Resolved" ? COLORS.green : COLORS.amber));
    });

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // let us write in the bottom margin without adding a page
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.faint).text(
        `CONFIDENTIAL  |  SoloSafe Team Log  |  Page ${i + 1} of ${range.count}`,
        48,
        doc.page.height - 36,
        { width: W, align: "center", lineBreak: false }
      );
    }
    doc.end();
  });
}
