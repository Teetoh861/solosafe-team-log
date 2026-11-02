import { getUser, isAdmin } from "../../lib/auth";
import {
  CATEGORIES,
  STATUSES,
  addComment,
  createSuggestion,
  deleteComment,
  deleteSuggestion,
  getComment,
  getSuggestion,
  listSuggestions,
  setStatus,
  setVote,
} from "../../lib/suggestions";
import { notifySuggestion, notifySuggestionComment, notifySuggestionStatus } from "../../lib/notify";

const text = (v, max) => String(v ?? "").trim().slice(0, max);

// Open board: every signed-in team member sees and can comment on everything.
export default async function handler(req, res) {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Not signed in." });

    if (req.method === "GET") {
      const suggestions = await listSuggestions(user);
      suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.status(200).json({ suggestions, statuses: STATUSES, categories: CATEGORIES });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const { action, id } = req.body || {};

    if (action === "create") {
      const title = text(req.body.title, 120);
      const body = text(req.body.body, 4000);
      const category = CATEGORIES.includes(req.body.category) ? req.body.category : "New feature";
      if (title.length < 3) return res.status(400).json({ error: "Give your suggestion a short title." });
      if (body.length < 5) return res.status(400).json({ error: "Please describe the idea a little." });
      const s = await createSuggestion({ name: user, title, body, category });
      await notifySuggestion(s);
      return res.status(201).json({ suggestion: await getSuggestion(s.id, user) });
    }

    const s = id ? await getSuggestion(id, user) : null;
    if (!s) return res.status(404).json({ error: "Suggestion not found." });

    if (action === "comment") {
      const t = text(req.body.text, 2000);
      if (t.length < 1) return res.status(400).json({ error: "Write a comment first." });
      const comment = await addComment(s.id, { name: user, text: t });
      await notifySuggestionComment(s, comment);
      return res.status(201).json({ suggestion: await getSuggestion(s.id, user) });
    }

    if (action === "vote") {
      const value = Number(req.body.value);
      if (![1, -1, 0].includes(value)) return res.status(400).json({ error: "Bad vote." });
      await setVote(s.id, user, value);
      return res.status(200).json({ suggestion: await getSuggestion(s.id, user) });
    }

    if (action === "status") {
      if (!isAdmin(user)) return res.status(403).json({ error: "Only admins can change the status." });
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Unknown status." });
      const updated = await setStatus(s.id, req.body.status);
      if (updated.status !== s.status) await notifySuggestionStatus(updated, user);
      return res.status(200).json({ suggestion: await getSuggestion(s.id, user) });
    }

    if (action === "delete") {
      if (s.name !== user && !isAdmin(user)) return res.status(403).json({ error: "Not allowed." });
      await deleteSuggestion(s.id);
      return res.status(200).json({ ok: true });
    }

    if (action === "delete-comment") {
      const c = await getComment(req.body.commentId);
      if (!c || c.suggestionId !== s.id) return res.status(404).json({ error: "Comment not found." });
      if (c.name !== user && !isAdmin(user)) return res.status(403).json({ error: "Not allowed." });
      await deleteComment(s.id, c.id);
      return res.status(200).json({ suggestion: await getSuggestion(s.id, user) });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
