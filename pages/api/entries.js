import { listEntries, addEntry } from "../../lib/kv";

const TEAM = ["Inioluwa", "Tobi", "Benedict", "Emmanuel", "Nicholas", "Kelvin"];
const TYPES = ["Daily", "Weekly", "Blocker"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const entries = await listEntries();
      return res.status(200).json({ entries });
    }

    if (req.method === "POST") {
      const { name, type, completed, planned, blockers, needsDecision, escalatedTo, status } = req.body || {};

      if (!name || !TEAM.includes(name)) {
        return res.status(400).json({ error: "Pick a valid name." });
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
