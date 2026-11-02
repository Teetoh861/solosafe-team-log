import { MEMBERS } from "../../../lib/auth";
import { listEntries } from "../../../lib/kv";
import { APP_URL, sendMailSafe } from "../../../lib/mail";

const clip = (s, n = 160) => (s && s.length > n ? `${s.slice(0, n)}...` : s || "");

// Scheduled in vercel.json (Mondays, 09:00 Lagos). One gentle weekly nudge to everyone,
// plus any blockers of theirs that are still open.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const entries = await listEntries();
    await Promise.all(
      MEMBERS.map((m) => {
        const open = entries.filter((e) => e.name === m.name && e.type === "Blocker" && e.status !== "Resolved");
        const lines = [
          `Hi ${m.name},`,
          "",
          "Happy new week. A quick reminder to log your updates this week:",
          "",
          "- Log a Daily update each working day (what you completed, what's next).",
          "- Add a Weekly check-in before the week ends.",
          "- Log a Blocker as soon as something is holding you up.",
        ];
        if (open.length) {
          lines.push("", `You still have ${open.length} open blocker${open.length === 1 ? "" : "s"}. If ${open.length === 1 ? "it's" : "they're"} sorted, please mark ${open.length === 1 ? "it" : "them"} resolved:`);
          open.forEach((b) => lines.push(`- ${clip(b.blockers)}`));
        }
        lines.push("", APP_URL, "", "Thanks,", "SoloSafe Team Log");
        return sendMailSafe({ to: m.email, subject: "New week: remember to log your updates", text: lines.join("\n") });
      })
    );
    return res.status(200).json({ ok: true, reminded: MEMBERS.map((m) => m.name) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Reminders failed." });
  }
}
