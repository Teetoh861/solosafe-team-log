import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import SuggestionCard from "../components/SuggestionCard";
import { api, useSession } from "../lib/useSession";

const field =
  "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-base text-white placeholder-white/50 outline-none focus:bg-white/15";

export default function Suggestions() {
  const { me, setMe, logout } = useSession();
  const [items, setItems] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [posting, setPosting] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("New feature");

  const [filterStatus, setFilterStatus] = useState("All");
  const [sort, setSort] = useState("new");

  const load = useCallback(async () => {
    try {
      const d = await api("/api/suggestions");
      setItems(d.suggestions);
      setStatuses(d.statuses);
      setCategories(d.categories);
    } catch (e) {
      if (e.status === 401) setMe(null);
      else setError(e.message);
    }
  }, [setMe]);

  useEffect(() => {
    if (!me) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [me, load]);

  // A card finished an action: swap in the updated suggestion, or drop a deleted one (updated === null).
  const onChange = (updated, id) =>
    setItems((list) => (updated ? list.map((x) => (x.id === id ? updated : x)) : list.filter((x) => x.id !== id)));

  async function post(e) {
    e.preventDefault();
    setPosting(true);
    setError("");
    setNotice("");
    try {
      const d = await api("/api/suggestions", { method: "POST", body: { action: "create", title, body, category } });
      setItems((list) => [d.suggestion, ...(list || [])]);
      setTitle("");
      setBody("");
      setNotice("Posted. Thanks for the idea!");
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  const visible = useMemo(() => {
    const list = (items || []).filter((s) => filterStatus === "All" || s.status === filterStatus);
    if (sort === "liked") list.sort((a, b) => b.up - b.down - (a.up - a.down) || new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [items, filterStatus, sort]);

  if (me === undefined) return <div className="min-h-screen bg-paper" />;
  if (me === null) return <LoginScreen onSignedIn={setMe} />;

  return (
    <div className="min-h-screen bg-paper">
      <Header me={me} onLogout={logout} active="suggestions" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        <section className="bg-brand text-white rounded-2xl p-4 sm:p-8">
          <h2 className="text-lg font-semibold">Suggest a feature or idea</h2>
          <p className="text-sm text-white/70 mt-1 mb-4">Everyone on the team can see, vote on and comment on suggestions.</p>
          <form onSubmit={post} className="space-y-4">
            <div>
              <label className="block text-xs text-white/70 mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={field} placeholder="e.g. Add a dark mode" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(categories.length ? categories : ["New feature", "Improvement", "Other"]).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-lg px-2 py-2.5 text-sm font-medium border transition ${
                    category === c ? "bg-white text-brand border-white" : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Describe it: what would it do, and why would it help?</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={field} />
            </div>
            {error && <p className="text-sm text-amber-light bg-black/10 rounded-lg px-3 py-2">{error}</p>}
            {notice && <p className="text-sm text-white bg-white/15 rounded-lg px-3 py-2">{notice}</p>}
            <button
              type="submit"
              disabled={posting}
              className="w-full sm:w-auto rounded-lg bg-white text-brand font-semibold px-6 py-3 hover:bg-white/90 transition disabled:opacity-60"
            >
              {posting ? "Posting…" : "Post suggestion"}
            </button>
          </form>
        </section>

        <section className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-md border border-line bg-white px-2 py-2 text-ink">
            <option>All</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-line bg-white px-2 py-2 text-ink">
            <option value="new">Newest</option>
            <option value="liked">Most liked</option>
          </select>
          <span className="text-inkfaint sm:ml-auto w-full sm:w-auto">
            {visible.length} suggestion{visible.length === 1 ? "" : "s"}
          </span>
        </section>

        <section>
          {items === null ? (
            <p className="text-inkfaint text-sm">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-line rounded-2xl">
              <p className="text-ink font-medium">No suggestions yet</p>
              <p className="text-inkfaint text-sm mt-1">Got an idea for the platform? Post the first one above.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-b border-line">
              {visible.map((s) => (
                <SuggestionCard key={s.id} s={s} me={me} statuses={statuses} onChange={onChange} onError={setError} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
