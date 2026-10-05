import { useEffect, useMemo, useState } from "react";

const TEAM = ["Inioluwa", "Tobi", "Benedict", "Emmanuel", "Nicholas", "Kelvin"];
const TYPES = ["Daily", "Weekly", "Blocker"];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function groupByDay(entries) {
  const groups = {};
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const key = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [me, setMe] = useState(undefined); // undefined = checking, null = signed out
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [type, setType] = useState("Daily");
  const [completed, setCompleted] = useState("");
  const [planned, setPlanned] = useState("");
  const [blockers, setBlockers] = useState("");
  const [needsDecision, setNeedsDecision] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");

  const [filterName, setFilterName] = useState("All");
  const [filterType, setFilterType] = useState("All");

  async function load() {
    try {
      const res = await fetch("/api/entries");
      if (res.status === 401) {
        setMe(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load entries.");
      setEntries(data.entries || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setMe(u))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!me) return;
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [me]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: loginName, code: loginCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sign in.");
      setLoginCode("");
      setLoading(true);
      setMe(data);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    setEntries([]);
    setMe(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body = { type, completed, planned, blockers, needsDecision, escalatedTo };
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setCompleted("");
      setPlanned("");
      setBlockers("");
      setNeedsDecision("");
      setEscalatedTo("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterName !== "All" && e.name !== filterName) return false;
      if (filterType !== "All" && e.type !== filterType) return false;
      return true;
    });
  }, [entries, filterName, filterType]);

  const grouped = groupByDay(filtered);

  if (me === undefined) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (me === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-brand text-white rounded-2xl p-6 sm:p-8 space-y-4">
          <div>
            <p className="text-sm font-semibold text-white/80">SoloSafe</p>
            <h1 className="text-xl font-semibold">Team Log</h1>
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">Your name</label>
            <select
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white outline-none focus:bg-white/15"
            >
              <option value="" className="text-ink">Select{"…"}</option>
              {TEAM.map((n) => (
                <option key={n} value={n} className="text-ink">{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">Access code</label>
            <input
              type="password"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white outline-none focus:bg-white/15"
            />
          </div>
          {loginError && <p className="text-sm text-amber-light bg-black/10 rounded-lg px-3 py-2">{loginError}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-white text-brand font-semibold px-6 py-2.5 hover:bg-white/90 transition"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-baseline justify-between">
          <div>
            <p className="text-sm tracking-tight text-brand font-semibold">SoloSafe</p>
            <h1 className="text-2xl font-semibold text-ink">Team Log</h1>
          </div>
          <div className="text-right text-sm text-inkfaint">
            <p>
              Signed in as <span className="text-ink font-medium">{me.name}</span>
              {" · "}
              <button onClick={handleLogout} className="underline">Log out</button>
            </p>
            <p>{me.isAdmin ? "You can see every entry." : "You see your own updates and all blockers."}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-10">
        {/* Entry form — the one bold element */}
        <section className="bg-brand text-white rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold mb-4">Log an update <span className="text-white/70 font-normal text-sm">as {me.name}</span></h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Type</label>
                <div className="flex gap-2">
                  {TYPES.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition ${
                        type === t
                          ? "bg-white text-brand border-white"
                          : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {type !== "Blocker" ? (
              <>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    {type === "Daily" ? "What you completed today" : "What you completed this week"}
                  </label>
                  <textarea
                    value={completed}
                    onChange={(e) => setCompleted(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 outline-none focus:bg-white/15"
                    placeholder="Shipped X, fixed Y\u2026"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    {type === "Daily" ? "What's planned for tomorrow" : "Priorities for next week"}
                  </label>
                  <textarea
                    value={planned}
                    onChange={(e) => setPlanned(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 outline-none focus:bg-white/15"
                    placeholder="Starting Z, finishing X\u2026"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Anything blocking you (optional)</label>
                  <textarea
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 outline-none focus:bg-white/15"
                    placeholder="Waiting on\u2026"
                  />
                </div>
                {type === "Weekly" && (
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Needs a decision from leadership? (optional)</label>
                    <textarea
                      value={needsDecision}
                      onChange={(e) => setNeedsDecision(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 outline-none focus:bg-white/15"
                      placeholder="Need sign-off on\u2026"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-white/70 mb-1">What's blocking you</label>
                  <textarea
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/50 outline-none focus:bg-white/15"
                    placeholder="Describe the blocker\u2026"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">Escalated to</label>
                  <select
                    value={escalatedTo}
                    onChange={(e) => setEscalatedTo(e.target.value)}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white outline-none focus:bg-white/15"
                  >
                    <option value="" className="text-ink">Select{"…"}</option>
                    {TEAM.map((n) => (
                      <option key={n} value={n} className="text-ink">{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && <p className="text-sm text-amber-light bg-black/10 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto rounded-lg bg-white text-brand font-semibold px-6 py-2.5 hover:bg-white/90 transition disabled:opacity-60"
            >
              {submitting ? "Saving\u2026" : "Log it"}
            </button>
          </form>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-inkfaint">Show:</span>
          {me.isAdmin && <select
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-ink"
          >
            <option>All</option>
            {TEAM.map((n) => <option key={n}>{n}</option>)}
          </select>}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-ink"
          >
            <option>All</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <span className="text-inkfaint ml-auto">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</span>
        </section>

        {/* Feed */}
        <section>
          {loading ? (
            <p className="text-inkfaint text-sm">Loading{"…"}</p>
          ) : filtered.length === 0 ? (
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
                    <li key={e.id} className="py-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{e.name}</span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              e.type === "Blocker"
                                ? "bg-amber-light text-amber"
                                : e.type === "Weekly"
                                ? "bg-brand-light text-brand"
                                : "bg-line text-inkfaint"
                            }`}
                          >
                            {e.type}
                          </span>
                        </div>
                        <span className="text-xs text-inkfaint">{timeAgo(e.createdAt)}</span>
                      </div>

                      {e.type === "Blocker" ? (
                        <div className="text-sm text-ink space-y-0.5">
                          <p>{e.blockers}</p>
                          {e.escalatedTo && (
                            <p className="text-inkfaint">Escalated to <span className="text-ink font-medium">{e.escalatedTo}</span></p>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-ink space-y-1">
                          {e.completed && <p><span className="text-inkfaint">Completed:</span> {e.completed}</p>}
                          {e.planned && <p><span className="text-inkfaint">Next:</span> {e.planned}</p>}
                          {e.blockers && <p><span className="text-inkfaint">Blocked on:</span> {e.blockers}</p>}
                          {e.needsDecision && <p><span className="text-inkfaint">Needs decision:</span> {e.needsDecision}</p>}
                        </div>
                      )}
                    </li>
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
