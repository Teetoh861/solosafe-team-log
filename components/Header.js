import Link from "next/link";

export default function Header({ me, onLogout, active }) {
  const tab = (href, label, key) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
        active === key ? "bg-brand text-white" : "text-inkfaint hover:text-ink hover:bg-line/60"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline justify-between sm:block">
          <div>
            <p className="text-sm tracking-tight text-brand font-semibold leading-none">SoloSafe</p>
            <h1 className="text-xl sm:text-2xl font-semibold text-ink">Team Log</h1>
          </div>
          <p className="text-xs text-inkfaint sm:hidden text-right">
            {me.name} · <button onClick={onLogout} className="underline">Log out</button>
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <nav className="flex gap-1">
            {tab("/", "Log", "log")}
            {me.isAdmin && tab("/summary", "Weekly summary", "summary")}
          </nav>
          <p className="hidden sm:block text-sm text-inkfaint text-right">
            <span className="text-ink font-medium">{me.name}</span>
            {" · "}
            <button onClick={onLogout} className="underline">Log out</button>
          </p>
        </div>
      </div>
    </header>
  );
}
