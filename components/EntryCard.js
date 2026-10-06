import { useState } from "react";
import { api } from "../lib/useSession";
import { TEAM } from "../lib/team";

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function leftLabel(ms) {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

const area =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-base text-ink outline-none focus:border-brand";

export default function EntryCard({ entry: e, me, editWindowMs, onChanged, onError }) {
  const [mode, setMode] = useState(null); // null | "edit" | "request"
  const [draft, setDraft] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = e.name === me.name;
  const remaining = editWindowMs - (Date.now() - new Date(e.createdAt).getTime());
  const canChange = !e.derived && (me.isAdmin || (mine && remaining > 0));
  const canRequest = !e.derived && mine && !me.isAdmin && remaining <= 0;
  const canResolve = e.type === "Blocker" && !e.derived && (mine || me.isAdmin);
  const resolved = e.type === "Blocker" && e.status === "Resolved";

  async function run(fn) {
    setBusy(true);
    try {
      await fn();
      setMode(null);
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const startEdit = () => {
    setDraft({
      completed: e.completed || "",
      planned: e.planned || "",
      blockers: e.blockers || "",
      needsDecision: e.needsDecision || "",
      escalatedTo: e.escalatedTo || "",
    });
    setMode("edit");
  };

  const set = (k) => (ev) => setDraft((d) => ({ ...d, [k]: ev.target.value }));
  const btn = "text-xs font-medium px-3 py-2 rounded-md border border-line hover:bg-line/50 transition disabled:opacity-60";

  return (
    <li className={`py-4 ${resolved ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{e.name}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              e.type === "Blocker" ? "bg-amber-light text-amber" : e.type === "Weekly" ? "bg-brand-light text-brand" : "bg-line text-inkfaint"
            }`}
          >
            {e.type}
          </span>
          {e.needsDecision && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-light text-amber">Needs decision</span>
          )}
          {e.type === "Blocker" && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                resolved ? "bg-green-100 text-green-800" : "bg-red-50 text-red-700"
              }`}
            >
              {resolved ? "Resolved" : "Open"}
            </span>
          )}
        </div>
        <span className="text-xs text-inkfaint shrink-0" title={new Date(e.createdAt).toLocaleString()}>
          {timeAgo(e.createdAt)}
          {e.editedAt ? " · edited" : ""}
        </span>
      </div>

      {mode === "edit" ? (
        <div className="space-y-2">
          {e.type === "Blocker" ? (
            <>
              <textarea className={area} rows={3} value={draft.blockers} onChange={set("blockers")} />
              <select className={area} value={draft.escalatedTo} onChange={set("escalatedTo")}>
                <option value="">Not escalated</option>
                {TEAM.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="block text-xs text-inkfaint">Completed</label>
              <textarea className={area} rows={2} value={draft.completed} onChange={set("completed")} />
              <label className="block text-xs text-inkfaint">Next</label>
              <textarea className={area} rows={2} value={draft.planned} onChange={set("planned")} />
              <label className="block text-xs text-inkfaint">Blocked on</label>
              <textarea className={area} rows={2} value={draft.blockers} onChange={set("blockers")} />
              {e.type === "Weekly" && (
                <>
                  <label className="block text-xs text-inkfaint">Needs a decision</label>
                  <textarea className={area} rows={2} value={draft.needsDecision} onChange={set("needsDecision")} />
                </>
              )}
            </>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => api("/api/entries", { method: "PATCH", body: { id: e.id, action: "edit", ...draft } }))}
              className="text-xs font-semibold px-4 py-2 rounded-md bg-brand text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setMode(null)} className={btn}>
              Cancel
            </button>
          </div>
        </div>
      ) : e.type === "Blocker" ? (
        <div className="text-sm text-ink space-y-0.5 break-words">
          <p>{e.blockers}</p>
          {e.escalatedTo && (
            <p className="text-inkfaint">
              Escalated to <span className="text-ink font-medium">{e.escalatedTo}</span>
            </p>
          )}
          {resolved && e.resolvedBy && <p className="text-inkfaint">Resolved by {e.resolvedBy}</p>}
        </div>
      ) : (
        <div className="text-sm text-ink space-y-1 break-words">
          {e.completed && (
            <p>
              <span className="text-inkfaint">Completed:</span> {e.completed}
            </p>
          )}
          {e.planned && (
            <p>
              <span className="text-inkfaint">Next:</span> {e.planned}
            </p>
          )}
          {e.blockers && (
            <p>
              <span className="text-inkfaint">Blocked on:</span> {e.blockers}
            </p>
          )}
          {e.needsDecision && (
            <p>
              <span className="text-inkfaint">Needs decision:</span> {e.needsDecision}
            </p>
          )}
        </div>
      )}

      {mode === "request" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-inkfaint">
            The edit window has passed. Tell Inioluwa and Tobi what needs to change and why. They’ll get an email.
          </p>
          <textarea className={area} rows={3} value={message} onChange={(ev) => setMessage(ev.target.value)} placeholder="What should change, and why?" />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api("/api/entries", { method: "PATCH", body: { id: e.id, action: "request-change", message } });
                  setMessage("");
                  onError("", "Request sent. Inioluwa and Tobi have been emailed.");
                })
              }
              className="text-xs font-semibold px-4 py-2 rounded-md bg-brand text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send request"}
            </button>
            <button onClick={() => setMode(null)} className={btn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === null && (canResolve || canChange || canRequest) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canResolve && (
            <button
              disabled={busy}
              onClick={() => run(() => api("/api/entries", { method: "PATCH", body: { id: e.id, action: resolved ? "reopen" : "resolve" } }))}
              className={`text-xs font-semibold px-3 py-2 rounded-md ${
                resolved ? "border border-line hover:bg-line/50" : "bg-green-700 text-white hover:bg-green-800"
              } disabled:opacity-60`}
            >
              {resolved ? "Reopen" : "Mark resolved"}
            </button>
          )}
          {canChange && (
            <>
              <button onClick={startEdit} className={btn}>
                Edit
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Delete this entry? This can’t be undone.")) {
                    run(() => api(`/api/entries?id=${encodeURIComponent(e.id)}`, { method: "DELETE" }));
                  }
                }}
                className={`${btn} text-red-700`}
              >
                Delete
              </button>
              {!me.isAdmin && <span className="text-xs text-inkfaint">Editable for {leftLabel(remaining)}</span>}
            </>
          )}
          {canRequest && (
            <button onClick={() => setMode("request")} className={btn}>
              Request a change
            </button>
          )}
        </div>
      )}
    </li>
  );
}
