import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import { api, useSession } from "../lib/useSession";
import { downloadCsv, entriesToCsv } from "../lib/csv";
import { TEAM } from "../lib/team";
import { addDays, lagosDay, prettyDay, weekStart } from "../lib/dates";

export default function Summary() {
  const { me, setMe, logout } = useSession();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [emailing, setEmailing] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!me?.isAdmin) return;
    api("/api/entries")
      .then((d) => setEntries(d.entries || []))
      .catch((e) => (e.status === 401 ? setMe(null) : setError(e.message)));
  }, [me, setMe]);

  async function emailReport() {
    setEmailing(true);
    setNotice("");
    setError("");
    try {
      await api(`/api/report?week=${offset}`, { method: "POST" });
      setNotice("Sent. Check your inbox for the PDF report.");
    } catch (e) {
      setError(e.message);
    } finally {
      setEmailing(false);
    }
  }

  const start = weekStart(new Date(), offset);
  const allDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  const end = addDays(start, 6);

  const weekEntries = useMemo(
    () =>
      (entries || []).filter((e) => {
        const d = lagosDay(e.createdAt);
        return d >= start && d <= end;
      }),
    [entries, start, end]
  );

  const perPerson = useMemo(() => {
    if (!entries) return [];
    const inWeek = weekEntries;
    return TEAM.map((name) => {
      const mine = inWeek.filter((e) => e.name === name);
      const dailies = mine.filter((e) => e.type === "Daily").sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const weekly = mine.filter((e) => e.type === "Weekly");
      const blockers = mine.filter((e) => e.type === "Blocker");
      const loggedDays = new Set(mine.filter((e) => e.type !== "Blocker").map((e) => lagosDay(e.createdAt)));
      return { name, dailies, weekly, blockers, loggedDays };
    });
  }, [entries, weekEntries]);

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
  const notLogged = perPerson.filter((p) => p.loggedDays.size === 0).map((p) => p.name);
  const pendingDecisions = (name) =>
    weekEntries.filter((e) => e.name === name && e.needsDecision && e.decisionStatus !== "Decided").length;

  return (
    <div className="min-h-screen bg-paper print:bg-white">
      <Header me={me} onLogout={logout} active="summary" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 print:max-w-none print:p-0">
        <div className="hidden print:block border-b border-line pb-3">
          <p className="text-xs font-semibold tracking-widest text-inkfaint">CONFIDENTIAL</p>
          <p className="text-xs text-inkfaint">Prepared for SoloSafe</p>
          <h1 className="text-xl font-semibold text-ink mt-1">SoloSafe Team Log — Weekly summary</h1>
          <p className="text-sm text-inkfaint">{label}</p>
        </div>

        <div className="flex items-center justify-between gap-2 print:hidden">
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

        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={() => downloadCsv(`solosafe-team-log_${start}_to_${end}.csv`, entriesToCsv(weekEntries))}
            disabled={!entries}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-line/50 disabled:opacity-40"
          >
            Download CSV (this week)
          </button>
          <button
            onClick={() => downloadCsv(`solosafe-team-log_all-entries.csv`, entriesToCsv(entries || []))}
            disabled={!entries}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-line/50 disabled:opacity-40"
          >
            Download CSV (all entries)
          </button>
          <a
            href={`/api/report?week=${offset}`}
            className="rounded-md bg-brand text-white px-3 py-2 text-sm font-semibold hover:bg-brand-dark"
          >
            Download PDF report
          </a>
          <button
            onClick={emailReport}
            disabled={emailing}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-line/50 disabled:opacity-40"
          >
            {emailing ? "Sending…" : "Email me this PDF"}
          </button>
        </div>

        {error && <p className="text-sm text-red-700 print:hidden">{error}</p>}
        {notice && <p className="text-sm text-green-800 print:hidden">{notice}</p>}
        {!entries && !error && <p className="text-sm text-inkfaint">Loading…</p>}

        {entries && (
          <>
            <section className="rounded-2xl border border-line bg-white overflow-hidden break-inside-avoid">
              <h3 className="px-4 sm:px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-inkfaint">At a glance</h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left text-xs text-inkfaint">
                    <th className="px-4 sm:px-5 py-1.5 font-medium">Person</th>
                    <th className="px-2 py-1.5 font-medium">Days</th>
                    <th className="px-2 py-1.5 font-medium">Updates</th>
                    <th className="px-2 py-1.5 font-medium">Blockers</th>
                    <th className="pl-2 pr-4 sm:pr-5 py-1.5 font-medium">Decisions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {perPerson.map((p) => (
                    <tr key={p.name}>
                      <td className="px-4 sm:px-5 py-2 font-medium text-ink">{p.name}</td>
                      <td className={`px-2 py-2 ${p.loggedDays.size === 0 ? "text-red-700 font-medium" : ""}`}>{p.loggedDays.size}/5</td>
                      <td className="px-2 py-2">{p.dailies.length + p.weekly.length}</td>
                      <td className={`px-2 py-2 ${p.blockers.some((b) => b.status !== "Resolved") ? "text-amber font-medium" : ""}`}>
                        {p.blockers.filter((b) => b.status !== "Resolved").length}
                      </td>
                      <td className="pl-2 pr-4 sm:pr-5 py-2">{pendingDecisions(p.name)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 sm:px-5 py-3 text-xs text-inkfaint border-t border-line">
                {notLogged.length ? `Nothing logged this week: ${notLogged.join(", ")}. ` : "Everyone has logged this week. "}
                {openCount} open blocker{openCount === 1 ? "" : "s"} raised this week.
              </p>
            </section>
            {perPerson.map((p) => (
              <section key={p.name} className="rounded-2xl border border-line bg-white p-4 sm:p-5 break-inside-avoid">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-ink">{p.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-inkfaint">
                    <span>{p.loggedDays.size}/5 days logged</span>
                    <span className="flex gap-1">
                      {allDays.filter((d, i) => i < 5 || p.loggedDays.has(d)).map((d) => (
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
