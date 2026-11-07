import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sl_idea_banner_dismissed";

// Points people at the Suggestions page from the Log page, where they were looking for it.
export default function IdeaBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(!!localStorage.getItem(KEY));
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  return (
    <section className="rounded-2xl border border-brand/30 bg-brand-light p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-1">
        <p className="font-semibold text-ink">Got an idea for the platform?</p>
        <p className="text-sm text-inkfaint">Post it in Suggestions. The whole team can vote and comment.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/suggestions" className="rounded-lg bg-brand text-white font-semibold text-sm px-4 py-2.5 hover:bg-brand-dark transition">
          Suggest an idea
        </Link>
        <button
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {}
            setHidden(true);
          }}
          className="text-xs text-inkfaint underline px-2 py-2"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
