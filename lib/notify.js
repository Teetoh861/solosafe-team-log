import { ADMINS, MEMBERS, adminEmails } from "./auth";
import { APP_URL, sendMailSafe } from "./mail";
import { lagosDay, prettyDay } from "./dates";

const clip = (s, n = 400) => (s && s.length > n ? `${s.slice(0, n)}…` : s || "");

export async function notifyBlocker(entry) {
  const to = adminEmails(entry.name);
  if (to.length === 0) return;
  const lines = [
    `${entry.name} logged a blocker:`,
    "",
    clip(entry.blockers),
    "",
    entry.escalatedTo ? `Escalated to: ${entry.escalatedTo}` : "Not escalated to anyone yet.",
    "",
    `Open the log: ${APP_URL}`,
  ];
  await sendMailSafe({
    to: to.join(","),
    subject: `Blocker from ${entry.name}`,
    text: lines.join("\n"),
  });
}

// Daily/weekly entries that carry a blocker line also alert the admins.
export async function notifyBlockerInUpdate(entry) {
  const to = adminEmails(entry.name);
  if (to.length === 0 || !entry.blockers) return;
  await sendMailSafe({
    to: to.join(","),
    subject: `Blocker from ${entry.name} (in ${entry.type.toLowerCase()} update)`,
    text: `${entry.name} reported being blocked:\n\n${clip(entry.blockers)}\n\nOpen the log: ${APP_URL}`,
  });
}

export async function notifyDecision(entry) {
  const to = adminEmails(entry.name);
  if (to.length === 0 || !entry.needsDecision) return;
  await sendMailSafe({
    to: to.join(","),
    subject: `Decision needed from ${entry.name}`,
    text: `${entry.name} needs a decision from leadership (weekly check-in):\n\n${clip(entry.needsDecision)}\n\nOpen the log: ${APP_URL}`,
  });
}

export async function notifyChangeRequest(entry, user, message) {
  const to = adminEmails(user);
  if (to.length === 0) return;
  await sendMailSafe({
    to: to.join(","),
    subject: `${user} asks to change a ${entry.type.toLowerCase()} entry`,
    text: [
      `${user} wants to change an entry that is past the edit window.`,
      "",
      `Entry (${entry.type}, ${new Date(entry.createdAt).toUTCString()}):`,
      entry.type === "Blocker"
        ? clip(entry.blockers)
        : `Completed: ${clip(entry.completed)}\nNext: ${clip(entry.planned)}\nBlocked: ${clip(entry.blockers)}`,
      "",
      `Their explanation:`,
      clip(message, 1000),
      "",
      `Open the log to edit or delete it: ${APP_URL}`,
    ].join("\n"),
  });
}

export function buildDigest(entries, now = new Date()) {
  const today = lagosDay(now);
  const todays = entries.filter((e) => lagosDay(e.createdAt) === today);
  const updates = todays.filter((e) => e.type !== "Blocker");
  const loggedNames = new Set(updates.map((e) => e.name));
  const missing = MEMBERS.map((m) => m.name).filter((n) => !loggedNames.has(n));
  const openBlockers = entries
    .filter((e) => e.type === "Blocker" && e.status !== "Resolved")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const out = [`SoloSafe Team Log — ${prettyDay(today)}`, ""];

  out.push(`OPEN BLOCKERS (${openBlockers.length})`);
  if (openBlockers.length === 0) out.push("None. 🎉");
  for (const b of openBlockers) {
    const age = Math.max(0, Math.floor((now - new Date(b.createdAt)) / 86400000));
    out.push(`• ${b.name} (${age === 0 ? "today" : `${age}d open`}): ${clip(b.blockers, 250)}${b.escalatedTo ? ` — escalated to ${b.escalatedTo}` : ""}`);
  }

  const decisions = entries
    .filter((e) => e.needsDecision && e.decisionStatus !== "Decided")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  out.push("", `AWAITING A DECISION (${decisions.length})`);
  if (decisions.length === 0) out.push("None.");
  for (const d of decisions) {
    const age = Math.max(0, Math.floor((now - new Date(d.createdAt)) / 86400000));
    out.push(`• ${d.name} (${age === 0 ? "today" : `${age}d waiting`}): ${clip(d.needsDecision, 250)}`);
  }

  out.push("", `UPDATES TODAY (${updates.length})`);
  if (updates.length === 0) out.push("Nothing logged yet.");
  for (const e of updates) {
    out.push(`${e.name} — ${e.type}`);
    if (e.completed) out.push(`  Completed: ${clip(e.completed, 300)}`);
    if (e.planned) out.push(`  Next: ${clip(e.planned, 300)}`);
    if (e.blockers) out.push(`  Blocked on: ${clip(e.blockers, 300)}`);
    if (e.needsDecision) out.push(`  Needs decision: ${clip(e.needsDecision, 300)}`);
  }

  out.push("", `NOT LOGGED TODAY (${missing.length})`);
  out.push(missing.length ? missing.join(", ") : "Everyone has logged.");
  out.push("", `Open the log: ${APP_URL}`);
  return { text: out.join("\n"), openBlockers: openBlockers.length, decisions: decisions.length, missing };
}

export { ADMINS };
