import { adminEmails } from "../../../lib/auth";
import { listEntries } from "../../../lib/kv";
import { buildDigest } from "../../../lib/notify";
import { prettyDay, lagosDay } from "../../../lib/dates";
import { sendMail } from "../../../lib/mail";

// Scheduled in vercel.json (weekdays, 18:00 Lagos). Vercel sends the CRON_SECRET as a bearer token.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const entries = await listEntries();
    const { text, openBlockers, missing } = buildDigest(entries);
    await sendMail({
      to: adminEmails().join(","),
      subject: `Team Log digest — ${prettyDay(lagosDay(new Date()))} (${openBlockers} open blocker${openBlockers === 1 ? "" : "s"}, ${missing.length} not logged)`,
      text,
    });
    return res.status(200).json({ ok: true, openBlockers, missing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Digest failed." });
  }
}
