import Link from "next/link";
import { useEffect, useState } from "react";
import { useUpdateAvailable } from "../lib/useUpdateAvailable";

const SEEN_KEY = "sl_seen_suggestions";

export default function Header({ me, onLogout, active }) {
  const stale = useUpdateAvailable();
  const [showNew, setShowNew] = useState(false);

  // "New" tag on the Suggestions tab until the person has opened it once.
  useEffect(() => {
    try {
      if (active === "suggestions") localStorage.setItem(SEEN_KEY, "1");
      else setShowNew(!localStorage.getItem(SEEN_KEY));
    } catch {
      setShowNew(active !== "suggestions");
    }
  }, [active]);

  const tab = (href, label, key, badge) => (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm sm:text-base font-medium border transition ${
        active === key
          ? "bg-brand text-white border-brand"
          : "bg-white text-ink border-line hover:bg-line/50"
      }`}
    >
      {label}
      {badge && (
        <span className="rounded-full bg-amber text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 leading-none">
          New
        </span>
      )}
    </Link>
  );

  return (
    <header className="border-b border-line bg-paper print:hidden">
      {stale && (
        <div className="bg-brand text-white text-sm px-4 py-2 flex items-center justify-center gap-3">
          <span>A new version of the Team Log is available.</span>
          <button onClick={() => window.location.reload()} className="rounded-md bg-white text-brand font-semibold px-3 py-1">
            Refresh
          </button>
        </div>
      )}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm tracking-tight text-brand font-semibold leading-none">SoloSafe</p>
            <h1 className="text-xl sm:text-2xl font-semibold text-ink">Team Log</h1>
          </div>
          <p className="text-xs sm:text-sm text-inkfaint text-right pt-0.5">
            <span className="text-ink font-medium">{me.name}</span>
            {" · "}
            <button onClick={onLogout} className="underline">
              Log out
            </button>
          </p>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2">
          {tab("/", "Log", "log")}
          {tab("/suggestions", "Suggestions", "suggestions", showNew && active !== "suggestions")}
          {me.isAdmin && tab("/summary", "Weekly summary", "summary")}
        </nav>
      </div>
    </header>
  );
}
