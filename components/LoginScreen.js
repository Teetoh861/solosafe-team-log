import { useState } from "react";
import { api } from "../lib/useSession";

export default function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!sent) {
        await api("/api/session", { method: "POST", body: { action: "request", email } });
        setSent(true);
      } else {
        const user = await api("/api/session", { method: "POST", body: { action: "verify", email, code } });
        onSignedIn(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-3 text-base text-white placeholder-white/50 outline-none focus:bg-white/15";

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-brand text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white/80">SoloSafe</p>
          <h1 className="text-xl font-semibold">Team Log</h1>
        </div>
        {!sent ? (
          <div>
            <label className="block text-xs text-white/70 mb-1">Your SoloSafe email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="name@gosolosafe.net"
              className={input}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-white/80">
              If <span className="font-medium text-white">{email}</span> is on the team, a 6-digit code is on its way. It
              expires in 10 minutes.
            </p>
            <div>
              <label className="block text-xs text-white/70 mb-1">6-digit code</label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className={`${input} tracking-widest text-lg`}
              />
            </div>
          </>
        )}
        {error && <p className="text-sm text-amber-light bg-black/10 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-white text-brand font-semibold px-6 py-3 hover:bg-white/90 transition disabled:opacity-60"
        >
          {busy ? "One moment…" : sent ? "Sign in" : "Email me a code"}
        </button>
        {sent && (
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
            className="w-full text-sm text-white/70 underline"
          >
            Use a different email
          </button>
        )}
      </form>
    </div>
  );
}
