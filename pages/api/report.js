import { getUser, isAdmin, memberByName } from "../../lib/auth";
import { listEntries } from "../../lib/kv";
import { APP_URL, sendMail } from "../../lib/mail";
import { buildReportData, renderReportPdf, reportEmailText, reportFilename, reportSubject } from "../../lib/report";

// Admin-only. GET ?week=0|-1|... downloads the PDF. POST ?week=... emails it to the signed-in admin.
export default async function handler(req, res) {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Not signed in." });
    if (!isAdmin(user)) return res.status(403).json({ error: "Admins only." });

    const offset = Math.min(0, Math.max(-52, parseInt(req.query.week ?? "0", 10) || 0));
    const data = buildReportData(await listEntries(), new Date(), offset);
    const pdf = await renderReportPdf(data);

    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${reportFilename(data)}"`);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(pdf);
    }

    if (req.method === "POST") {
      await sendMail({
        to: memberByName(user).email,
        subject: reportSubject(data),
        text: reportEmailText(data, APP_URL),
        attachments: [{ filename: reportFilename(data), content: pdf, contentType: "application/pdf" }],
      });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not build the report." });
  }
}
