import { useState } from "react";
import { api } from "../lib/useSession";
import { timeAgo } from "../lib/dates";

const STATUS_STYLE = {
  New: "bg-line text-inkfaint",
  "Under review": "bg-brand-light text-brand",
  Planned: "bg-amber-light text-amber",
  Done: "bg-green-100 text-green-800",
  Declined: "bg-red-50 text-red-700",
};

const btn = "text-xs font-medium px-3 py-2 rounded-md border border-line hover:bg-line/50 transition disabled:opacity-60";

export default function SuggestionCard({ s, me, statuses, onChange, onError }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = s.name === me.name;

  async function act(body, { replace = true } = {}) {
    setBusy(true);
    try {
      const data = await api("/api/suggestions", { method: "POST", body: { id: s.id, ...body } });
      onChange(replace ? data.suggestion : null, s.id);
      onError("");
      return true;
    } catch (e) {
      onError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const vote = (value) => act({ action: "vote", value: s.myVote === value ? 0 : value });

  async function sendComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    if (await act({ action: "comment", text })) setText("");
  }

  const voteBtn = (value, label, count, active) => (
    <button
      onClick={() => vote(value)}
      disabled={busy}
      aria-pressed={active}
      className={`text-xs font-medium px-3 py-2 rounded-md border transition disabled:opacity-60 ${
        active ? (value === 1 ? "bg-green-100 border-green-300 text-green-800" : "bg-red-50 border-red-200 text-red-700") : "border-line hover:bg-line/50"
      }`}
    >
      {label} {count}
    </button>
  );

  return (
    <li className="py-5">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="font-semibold text-ink break-words">{s.title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] || STATUS_STYLE.New}`}>{s.status}</span>
      </div>
      <p className="text-xs text-inkfaint mb-2">
        {s.name} · {s.category} · <span title={new Date(s.createdAt).toLocaleString()}>{timeAgo(s.createdAt)}</span>
      </p>
      <p className="text-sm text-ink whitespace-pre-wrap break-words">{s.body}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {voteBtn(1, "👍 Good idea", s.up, s.myVote === 1)}
        {voteBtn(-1, "👎 Not needed", s.down, s.myVote === -1)}
        <button onClick={() => setOpen(!open)} className={btn}>
          💬 {s.comments.length} comment{s.comments.length === 1 ? "" : "s"}
        </button>
        {me.isAdmin && (
          <select
            value={s.status}
            disabled={busy}
            onChange={(e) => act({ action: "status", status: e.target.value })}
            className="text-xs rounded-md border border-line bg-white px-2 py-2"
            aria-label="Status"
          >
            {statuses.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        )}
        {(mine || me.isAdmin) && (
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm("Delete this suggestion and its comments?")) act({ action: "delete" }, { replace: false });
            }}
            className={`${btn} text-red-700`}
          >
            Delete
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 rounded-xl bg-white border border-line p-3 sm:p-4 space-y-3">
          {s.comments.length === 0 && <p className="text-sm text-inkfaint">No comments yet. Be the first.</p>}
          {s.comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-inkfaint">
                  <span className="font-semibold text-ink">{c.name}</span> · {timeAgo(c.createdAt)}
                </p>
                {(c.name === me.name || me.isAdmin) && (
                  <button disabled={busy} onClick={() => act({ action: "delete-comment", commentId: c.id })} className="text-xs text-red-700 underline">
                    Delete
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          ))}
          <form onSubmit={sendComment} className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Add a comment…"
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-base text-ink outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="text-xs font-semibold px-4 py-2.5 rounded-md bg-brand text-white hover:bg-brand-dark disabled:opacity-60"
            >
              Comment
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
