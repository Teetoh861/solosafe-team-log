import { listEntries, addEntry } from "../../lib/kv";
import { TEAM, getUser, isAdmin } from "../../lib/auth";

const TYPES = ["Daily", "Weekly", "Blocker"];

export default async function handler(req, res) {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Not signed in." });

    if (req.method === "GET") {
      const all = await listEntries();
      if (isAdmin(user)) return res.status(200).json({ entries: all });

      // Everyone else sees their own entries plus every blocker on the team.
      const entries = all.flatMap((e) => {
        if (e.name === user || e.type === "Blocker") return [e];
        if (e.blockers) {
          // Another person's daily/weekly: expose only the blocker, nothing else.
          return [{
            id: e.id,
            name: e.name,
            type: "Blocker",
            blockers: e.blockers,
            escalatedTo: "",
            status: "Open",
            createdAt: e.createdAt,
          }];
        }
        return [];
      });
      return res.status(200).json({ entries });
    }

    if (req.method === "POST") {
      const { type, completed, planned, blockers, needsDecision, escalatedTo, status } = req.body || {};

      const name = user; // always the signed-in person, never client-supplied
      if (escalatedTo && !TEAM.includes(escalatedTo)) {
        return res.status(400).json({ error: "Pick a valid person to escalate to." });
      }
      if (!type || !TYPES.includes(type)) {
        return res.status(400).json({ error: "Pick a valid entry type." });
      }

      const entry = await addEntry({
        name,
        type,
        completed: completed || "",
        planned: planned || "",
        blockers: blockers || "",
        needsDecision: needsDecision || "",
        escalatedTo: escalatedTo || "",
        status: type === "Blocker" ? (status || "Open") : "",
      });

      return res.status(201).json({ entry });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error:
        "Could not reach storage. If this is a fresh deploy, make sure a Vercel KV store is connected to this project (see README).",
    });
  }
}
