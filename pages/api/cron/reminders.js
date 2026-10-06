import { MEMBERS } from "../../../lib/auth";
import { listEntries } from "../../../lib/kv";
import { lagosDay } from "../../../lib/dates";
import { APP_URL, sendMailSafe } from "../../../lib/mail";

// Scheduled in vercel.json (weekdays, 16:00 Lagos). Emails anyone with no daily/weekly update today.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const today = lagosDay(new Date());
    const entries = await listEntries();
    const logged = new Set(
      entries.filter((e) => e.type !== "Blocker" && lagosDay(e.createdAt) === today).map((e) => e.name)
    );
    const pending = MEMBERS.filter((m) => !logged.has(m.name));
    await Promise.all(
      pending.map((m) =>
        sendMailSafe({
          to: m.email,
          subject: "Reminder: log your update today",
          text: `Hi ${m.name},\n\nWe haven't seen an update from you today. Please log your daily update when you can:\n\n${APP_URL}\n\nThanks,\nSoloSafe Team Log`,
        })
      )
    );
    return res.status(200).json({ ok: true, reminded: pending.map((m) => m.name) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Reminders failed." });
  }
}
