import { listEntries, addEntry, getEntry, saveEntry, deleteEntry } from "../../lib/kv";
import { TEAM, getUser, isAdmin } from "../../lib/auth";
import { notifyBlocker, notifyBlockerInUpdate, notifyChangeRequest, notifyDecision, notifyDecided } from "../../lib/notify";

const TYPES = ["Daily", "Weekly", "Blocker"];
const FIELDS = ["completed", "planned", "blockers", "needsDecision"];
const MAX_LEN = 4000;

// How long the author can edit or delete their own entry. Admins are never limited.
export const EDIT_WINDOW_MS = Number(process.env.EDIT_WINDOW_MINUTES ?? 180) * 60 * 1000;

const clean = (v) => String(v || "").slice(0, MAX_LEN);

function canChange(user, entry) {
  if (isAdmin(user)) return true;
  return entry.name === user && Date.now() - new Date(entry.createdAt).getTime() < EDIT_WINDOW_MS;
}

export default async function handler(req, res) {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Not signed in." });

    if (req.method === "GET") {
      const all = await listEntries();
      if (isAdmin(user)) return res.status(200).json({ entries: all, editWindowMs: EDIT_WINDOW_MS });

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
            derived: true,
            createdAt: e.createdAt,
          }];
        }
        return [];
      });
      return res.status(200).json({ entries, editWindowMs: EDIT_WINDOW_MS });
    }

    if (req.method === "POST") {
      const { type, escalatedTo } = req.body || {};
      if (!type || !TYPES.includes(type)) {
        return res.status(400).json({ error: "Pick a valid entry type." });
      }
      if (escalatedTo && !TEAM.includes(escalatedTo)) {
        return res.status(400).json({ error: "Pick a valid person to escalate to." });
      }
      const body = req.body;
      const entry = await addEntry({
        name: user, // always the signed-in person, never client-supplied
        type,
        completed: clean(body.completed),
        planned: clean(body.planned),
        blockers: clean(body.blockers),
        needsDecision: clean(body.needsDecision),
        escalatedTo: escalatedTo || "",
        status: type === "Blocker" ? "Open" : "",
      });

      if (type === "Blocker") await notifyBlocker(entry);
      else if (entry.blockers) await notifyBlockerInUpdate(entry);
      if (entry.needsDecision) await notifyDecision(entry);

      return res.status(201).json({ entry });
    }

    if (req.method === "PATCH") {
      const { id, action } = req.body || {};
      const entry = id ? await getEntry(id) : null;
      if (!entry) return res.status(404).json({ error: "Entry not found." });
      const owns = entry.name === user;
      if (!owns && !isAdmin(user)) return res.status(403).json({ error: "Not allowed." });

      if (action === "edit") {
        if (!canChange(user, entry)) {
          return res.status(403).json({ error: "The edit window has passed. Use “Request a change”." });
        }
        const next = { ...entry };
        for (const f of FIELDS) if (f in req.body) next[f] = clean(req.body[f]);
        if ("escalatedTo" in req.body) {
          if (req.body.escalatedTo && !TEAM.includes(req.body.escalatedTo)) {
            return res.status(400).json({ error: "Pick a valid person to escalate to." });
          }
          next.escalatedTo = req.body.escalatedTo || "";
        }
        next.editedAt = new Date().toISOString();
        return res.status(200).json({ entry: await saveEntry(next) });
      }

      if (action === "resolve" || action === "reopen") {
        if (entry.type !== "Blocker") return res.status(400).json({ error: "Only blockers can be resolved." });
        const next = { ...entry };
        if (action === "resolve") {
          next.status = "Resolved";
          next.resolvedAt = new Date().toISOString();
          next.resolvedBy = user;
        } else {
          next.status = "Open";
          delete next.resolvedAt;
          delete next.resolvedBy;
        }
        return res.status(200).json({ entry: await saveEntry(next) });
      }

      if (action === "decide" || action === "undecide") {
        if (!isAdmin(user)) return res.status(403).json({ error: "Only admins can record decisions." });
        if (!entry.needsDecision) return res.status(400).json({ error: "This entry has no decision request." });
        const next = { ...entry };
        if (action === "decide") {
          next.decisionStatus = "Decided";
          next.decidedAt = new Date().toISOString();
          next.decidedBy = user;
          await notifyDecided(next, user);
        } else {
          delete next.decisionStatus;
          delete next.decidedAt;
          delete next.decidedBy;
        }
        return res.status(200).json({ entry: await saveEntry(next) });
      }

      if (action === "request-change") {
        const message = clean(req.body.message).trim();
        if (message.length < 5) return res.status(400).json({ error: "Please explain what needs to change." });
        await notifyChangeRequest(entry, user, message);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "Unknown action." });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      const entry = id ? await getEntry(id) : null;
      if (!entry) return res.status(404).json({ error: "Entry not found." });
      if (entry.name !== user && !isAdmin(user)) return res.status(403).json({ error: "Not allowed." });
      if (!canChange(user, entry)) {
        return res.status(403).json({ error: "The delete window has passed. Use “Request a change”." });
      }
      await deleteEntry(entry.id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error:
        "Could not reach storage. If this is a fresh deploy, make sure a Vercel KV store is connected to this project (see README).",
    });
  }
}
