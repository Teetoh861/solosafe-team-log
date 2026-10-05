import { clearCookie, getUser, isAdmin, sessionCookie } from "../../lib/auth";
import { requestCode, verifyCode } from "../../lib/otp";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const name = getUser(req);
      if (!name) return res.status(401).json({ error: "Not signed in." });
      return res.status(200).json({ name, isAdmin: isAdmin(name) });
    }

    if (req.method === "POST") {
      const { action, email, code } = req.body || {};

      if (action === "request") {
        await requestCode(email);
        // Same answer whether or not the email is on the team list.
        return res.status(200).json({ ok: true });
      }

      if (action === "verify") {
        const name = await verifyCode(email, code);
        if (!name) return res.status(401).json({ error: "That code is wrong or has expired." });
        res.setHeader("Set-Cookie", sessionCookie(name));
        return res.status(200).json({ name, isAdmin: isAdmin(name) });
      }

      return res.status(400).json({ error: "Bad request." });
    }

    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", clearCookie());
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not send the code. Try again in a minute." });
  }
}
