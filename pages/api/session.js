import { checkCode, clearCookie, getUser, isAdmin, sessionCookie } from "../../lib/auth";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const name = getUser(req);
      if (!name) return res.status(401).json({ error: "Not signed in." });
      return res.status(200).json({ name, isAdmin: isAdmin(name) });
    }

    if (req.method === "POST") {
      const { name, code } = req.body || {};
      if (!checkCode(name, code)) {
        return res.status(401).json({ error: "Wrong name or access code." });
      }
      res.setHeader("Set-Cookie", sessionCookie(name));
      return res.status(200).json({ name, isAdmin: isAdmin(name) });
    }

    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", clearCookie());
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sign-in is not configured." });
  }
}
