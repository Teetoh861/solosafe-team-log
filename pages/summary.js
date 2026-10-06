import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import { api, useSession } from "../lib/useSession";
import { TEAM } from "../lib/team";
import { addDays, lagosDay, prettyDay, weekStart } from "../lib/dates";

export default function Summary() {
  const { me, setMe, logout } = useSession();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!me?.isAdmin) return;
    api("/api/entries")
      .then((d) => setEntries(d.entries || []))
      .catch((e) => (e.status === 401 ? setMe(null) : setError(e.message)));
  }, [me, setMe]);

  const start = weekStart(new Date(), offset);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(start, i));
  const end = addDays(start, 6);

  const perPerson = useMemo(() => {
    if (!entries) return [];
    const inWeek = entries.filter((e) => {
      const d = lagosDay(e.createdAt);
      return d >= start && d <= end;
    });
    return TEAM.map((name) => {
      const mine = inWeek.filter((e) => e.name === name);
      const dailies = mine.filter((e) => e.type === "Daily").sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const weekly = mine.filter((e) => e.type === "Weekly");
      const blockers = mine.filter((e) => e.type === "Blocker");
      const loggedDays = new Set(mine.filter((e) => e.type !== "Blocker").map((e) => lagosDay(e.createdAt)));
      return { name, dailies, weekly, blockers, loggedDays };
    });
  }, [entries, start, end]);

  if (me === undefined) return <div className="min-h-screen bg-paper" />;
  if (me === null) return <LoginScreen onSignedIn={setMe} />;

  if (!me.isAdmin) {
    return (
      <div className="min-h-screen bg-paper">
        <Header me={me} onLogout={logout} active="summary" />
        <p className="mx-auto max-w-3xl px-4 py-10 text-inkfaint">The weekly summary is only available to admins.</p>
      </div>
    );
  }

  const label = `${prettyDay(start)} – ${prettyDay(end)}`;
  const openCount = perPerson.reduce((n, p) => n + p.blockers.filter((b) => b.status !== "Resolved").length, 0);

  return (
    <div className="min-h-screen bg-paper">
      <Header me={me} onLogout={logout} active="summary" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Weekly summary</h2>
            <p className="text-sm text-inkfaint">{label}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOffset(offset - 1)} className="rounded-md border border-line bg-white px-3 py-2 text-sm whitespace-nowrap hover:bg-line/50">
              ← Prev
            </button>
            <button
              onClick={() => setOffset(offset + 1)}
              disabled={offset >= 0}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm whitespace-nowrap hover:bg-line/50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {!entries && !error && <p className="text-sm text-inkfaint">Loading…</p>}

        {entries && (
          <>
            <p className="text-sm text-inkfaint">
              {openCount} blocker{openCount === 1 ? "" : "s"} raised this week still open.
            </p>
            {perPerson.map((p) => (
              <section key={p.name} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-ink">{p.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-inkfaint">
                    <span>{[...days].filter((d) => p.loggedDays.has(d)).length}/5 days logged</span>
                    <span className="flex gap-1">
                      {days.map((d) => (
                        <span
                          key={d}
                          title={prettyDay(d)}
                          className={`h-2.5 w-2.5 rounded-full ${p.loggedDays.has(d) ? "bg-brand" : "bg-line"}`}
                        />
                      ))}
                    </span>
                  </div>
                </div>

                {p.dailies.length === 0 && p.weekly.length === 0 && p.blockers.length === 0 && (
                  <p className="text-sm text-inkfaint">Nothing logged this week.</p>
                )}

                {p.weekly.map((e) => (
                  <div key={e.id} className="mb-3 rounded-lg bg-brand-light p-3 text-sm space-y-1">
                    <p className="text-xs font-semibold text-brand">Weekly check-in</p>
                    {e.completed && <p><span className="text-inkfaint">Completed:</span> {e.completed}</p>}
                    {e.planned && <p><span className="text-inkfaint">Next week:</span> {e.planned}</p>}
                    {e.blockers && <p><span className="text-inkfaint">Blocked on:</span> {e.blockers}</p>}
                    {e.needsDecision && (
                      <p>
                        <span className="text-inkfaint">Needs decision:</span> {e.needsDecision}
                        <span className="text-inkfaint"> — {e.decisionStatus === "Decided" ? `decided by ${e.decidedBy}` : "waiting"}</span>
                      </p>
                    )}
                  </div>
                ))}

                {p.dailies.length > 0 && (
                  <ul className="space-y-2">
                    {p.dailies.map((e) => (
                      <li key={e.id} className="text-sm">
                        <span className="text-xs font-semibold text-inkfaint uppercase tracking-wide">{prettyDay(lagosDay(e.createdAt))}</span>
                        {e.completed && <p>{e.completed}</p>}
                        {e.blockers && <p className="text-amber"><span className="font-medium">Blocked:</span> {e.blockers}</p>}
                      </li>
                    ))}
                  </ul>
                )}

                {p.blockers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line text-sm space-y-1">
                    <p className="text-xs font-semibold text-inkfaint uppercase tracking-wide">Blockers</p>
                    {p.blockers.map((b) => (
                      <p key={b.id}>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-2 ${b.status === "Resolved" ? "bg-green-100 text-green-800" : "bg-red-50 text-red-700"}`}>
                          {b.status === "Resolved" ? "Resolved" : "Open"}
                        </span>
                        {b.blockers}
                        {b.escalatedTo && <span className="text-inkfaint"> — escalated to {b.escalatedTo}</span>}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
