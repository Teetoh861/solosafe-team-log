import { lagosDay } from "./dates";

const COLUMNS = [
  "Date",
  "Time (Lagos)",
  "Name",
  "Type",
  "Completed",
  "Next / planned",
  "Blocked on",
  "Needs decision",
  "Escalated to",
  "Blocker status",
  "Decision status",
  "Resolved / decided by",
];

// Spreadsheet apps run text that starts with = + - @ as a formula. Team text ends up in
// Excel/Sheets, so neutralise those cells.
function cell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const timeOf = (iso) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function entriesToCsv(entries) {
  const rows = [...entries]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((e) => [
      lagosDay(e.createdAt),
      timeOf(e.createdAt),
      e.name,
      e.type,
      e.completed,
      e.planned,
      e.blockers,
      e.needsDecision,
      e.escalatedTo,
      e.type === "Blocker" ? e.status || "Open" : "",
      e.needsDecision ? e.decisionStatus || "Waiting" : "",
      e.resolvedBy || e.decidedBy || "",
    ]);
  // BOM so Excel reads UTF-8; CRLF line endings per the CSV spec.
  return "﻿" + [COLUMNS, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
