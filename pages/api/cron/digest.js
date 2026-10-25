import { adminEmails } from "../../../lib/auth";
import { listEntries } from "../../../lib/kv";
import { buildDigest } from "../../../lib/notify";
import { buildReportData, renderReportPdf, reportEmailText, reportFilename, reportSubject } from "../../../lib/report";
import { prettyDay, lagosDay, lagosWeekdayIndex } from "../../../lib/dates";
import { APP_URL, sendMail } from "../../../lib/mail";

// Scheduled in vercel.json (weekdays, 18:00 Lagos). Vercel sends the CRON_SECRET as a bearer token.
// Mon-Thu: the daily digest. Friday: the weekly report email with the PDF attached instead.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const now = new Date();
    const entries = await listEntries();

    if (lagosWeekdayIndex(now) === 4 || req.query.weekly === "1") {
      const data = buildReportData(entries, now, 0);
      const pdf = await renderReportPdf(data);
      await sendMail({
        to: adminEmails().join(","),
        subject: reportSubject(data),
        text: reportEmailText(data, APP_URL),
        attachments: [{ filename: reportFilename(data), content: pdf, contentType: "application/pdf" }],
      });
      return res.status(200).json({ ok: true, kind: "weekly", actions: data.actions.length });
    }

    const { text, openBlockers, decisions, missing } = buildDigest(entries);
    await sendMail({
      to: adminEmails().join(","),
      subject: `Team Log digest — ${prettyDay(lagosDay(now))} (${openBlockers} open blocker${openBlockers === 1 ? "" : "s"}, ${decisions} decision${decisions === 1 ? "" : "s"}, ${missing.length} not logged)`,
      text,
    });
    return res.status(200).json({ ok: true, kind: "digest", openBlockers, missing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Digest failed." });
  }
}
