import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import EntryCard from "../components/EntryCard";
import { api, useSession } from "../lib/useSession";
import { TEAM } from "../lib/team";
import { lagosDay, lagosWeekdayIndex } from "../lib/dates";

const TYPES = ["Daily", "Weekly", "Blocker"];

function groupByDay(entries) {
  const groups = {};
  for (const e of entries) {
    const key = new Date(e.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    (groups[key] = groups[key] || []).push(e);
  }
  return groups;
}

const field =
  "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-base text-white placeholder-white/50 outline-none focus:bg-white/15";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-white/70 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function Home() {
  const { me, setMe, logout } = useSession();
  const [entries, setEntries] = useState([]);
  const [editWindowMs, setEditWindowMs] = useState(3 * 60 * 60 * 1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const [type, setType] = useState("Daily");
  const [completed, setCompleted] = useState("");
  const [planned, setPlanned] = useState("");
  const [blockers, setBlockers] = useState("");
  const [needsDecision, setNeedsDecision] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");

  const [filterName, setFilterName] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const load = useCallback(async () => {
    try {
      const data = await api("/api/entries");
      setEntries(data.entries || []);
      if (data.editWindowMs) setEditWindowMs(data.editWindowMs);
      setError("");
    } catch (e) {
      if (e.status === 401) setMe(null);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [setMe]);

  useEffect(() => {
    if (!me) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [me, load]);

  function report(msg, okNotice = "") {
    setError(msg);
    setNotice(okNotice);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await api("/api/entries", {
        method: "POST",
        body: { type, completed, planned, blockers, needsDecision, escalatedTo },
      });
      setCompleted("");
      setPlanned("");
      setBlockers("");
      setNeedsDecision("");
      setEscalatedTo("");
      setNotice(type === "Blocker" ? "Blocker logged. Inioluwa and Tobi have been emailed." : "Logged. Thank you!");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startBlocker() {
    setType("Blocker");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const openBlockers = useMemo(
    () =>
      entries
        .filter((e) => e.type === "Blocker" && e.status !== "Resolved" && !e.derived)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [entries]
  );

  const pendingDecisions = useMemo(
    () =>
      entries
        .filter((e) => e.needsDecision && e.decisionStatus !== "Decided")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [entries]
  );
  const attention = useMemo(
    () => [...openBlockers, ...pendingDecisions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [openBlockers, pendingDecisions]
  );

  const missingToday = useMemo(() => {
    if (!me?.isAdmin) return [];
    const now = new Date();
    if (lagosWeekdayIndex(now) > 4) return [];
    const today = lagosDay(now);
    const logged = new Set(entries.filter((e) => e.type !== "Blocker" && lagosDay(e.createdAt) === today).map((e) => e.name));
    return TEAM.filter((n) => !logged.has(n));
  }, [entries, me]);

  const filtered = useMemo(
    () =>
      entries.filter((e) => (filterName === "All" || e.name === filterName) && (filterType === "All" || e.type === filterType)),
    [entries, filterName, filterType]
  );
  // With no filters on, open blockers already show in "Needs attention", so skip them in the feed.
  const feed = useMemo(() => {
    if (filterName !== "All" || filterType !== "All") return filtered;
    const pinned = new Set(attention.map((e) => e.id));
    return filtered.filter((e) => !pinned.has(e.id));
  }, [filtered, attention, filterName, filterType]);
  const grouped = groupByDay(feed);

  if (me === undefined) return <div className="min-h-screen bg-paper" />;
  if (me === null) return <LoginScreen onSignedIn={(u) => { setLoading(true); setMe(u); }} />;

  const cardProps = { me, editWindowMs, onChanged: load, onError: report };

  return (
    <div className="min-h-screen bg-paper">
      <Header me={me} onLogout={logout} active="log" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Needs attention */}
        {attention.length > 0 && (
          <section className="rounded-2xl border border-amber/40 bg-amber-light p-4 sm:p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-amber">
                Needs attention
                {openBlockers.length > 0 && ` · ${openBlockers.length} open blocker${openBlockers.length === 1 ? "" : "s"}`}
                {pendingDecisions.length > 0 && ` · ${pendingDecisions.length} decision${pendingDecisions.length === 1 ? "" : "s"} waiting`}
              </h2>
              <span className="text-xs text-amber/80">Oldest first</span>
            </div>
            <ul className="divide-y divide-amber/20">
              {attention.map((e) => (
                <EntryCard key={e.id} entry={e} {...cardProps} />
              ))}
            </ul>
          </section>
        )}

        {me.isAdmin && missingToday.length > 0 && (
          <p className="text-sm bg-white border border-line rounded-xl px-4 py-3 text-ink">
            <span className="font-semibold">No update yet today:</span>{" "}
            <span className="text-inkfaint">{missingToday.join(", ")}</span>
          </p>
        )}

        {/* Entry form */}
        <section ref={formRef} className="bg-brand text-white rounded-2xl p-4 sm:p-8 scroll-mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Log an update <span className="text-white/70 font-normal text-sm">as {me.name}</span>
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium border transition ${
                    type === t ? "bg-white text-brand border-white" : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {type !== "Blocker" ? (
              <>
                <Field label={type === "Daily" ? "What you completed today" : "What you completed this week"}>
                  <textarea value={completed} onChange={(e) => setCompleted(e.target.value)} rows={2} className={field} placeholder="Shipped X, fixed Y…" />
                </Field>
                <Field label={type === "Daily" ? "What's planned for tomorrow" : "Priorities for next week"}>
                  <textarea value={planned} onChange={(e) => setPlanned(e.target.value)} rows={2} className={field} placeholder="Starting Z, finishing X…" />
                </Field>
                <Field label="Anything blocking you (optional — Inioluwa and Tobi are alerted, and the team can see it)">
                  <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} rows={2} className={field} placeholder="Waiting on…" />
                </Field>
                {type === "Weekly" && (
                  <Field label="Needs a decision from leadership? (optional)">
                    <textarea value={needsDecision} onChange={(e) => setNeedsDecision(e.target.value)} rows={2} className={field} placeholder="Need sign-off on…" />
                  </Field>
                )}
              </>
            ) : (
              <>
                <Field label="What's blocking you, and what does it depend on?">
                  <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} rows={3} className={field} placeholder="e.g. Design is waiting on the engineering API…" />
                </Field>
                <Field label="Escalated to">
                  <select value={escalatedTo} onChange={(e) => setEscalatedTo(e.target.value)} className={field}>
                    <option value="" className="text-ink">Select…</option>
                    {TEAM.map((n) => (
                      <option key={n} value={n} className="text-ink">{n}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            {error && <p className="text-sm text-amber-light bg-black/10 rounded-lg px-3 py-2">{error}</p>}
            {notice && <p className="text-sm text-white bg-white/15 rounded-lg px-3 py-2">{notice}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto rounded-lg bg-white text-brand font-semibold px-6 py-3 hover:bg-white/90 transition disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Log it"}
            </button>
          </form>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
          {me.isAdmin && (
            <select value={filterName} onChange={(e) => setFilterName(e.target.value)} className="rounded-md border border-line bg-white px-2 py-2 text-ink">
              <option>All</option>
              {TEAM.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          )}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-line bg-white px-2 py-2 text-ink">
            <option>All</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button onClick={startBlocker} className="rounded-md border border-line bg-white px-3 py-2 text-ink hover:bg-line/50">
            + Log a blocker
          </button>
          <span className="text-inkfaint sm:ml-auto w-full sm:w-auto">
            {feed.length} entr{feed.length === 1 ? "y" : "ies"}
          </span>
        </section>

        {/* Feed */}
        <section>
          {loading ? (
            <p className="text-inkfaint text-sm">Loading…</p>
          ) : feed.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-line rounded-2xl">
              <p className="text-ink font-medium">Nothing logged yet</p>
              <p className="text-inkfaint text-sm mt-1">Be the first to post an update above.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([day, items]) => (
              <div key={day} className="mb-8">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-inkfaint mb-3">{day}</h3>
                <ul className="divide-y divide-line border-t border-b border-line">
                  {items.map((e) => (
                    <EntryCard key={e.id} entry={e} {...cardProps} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
