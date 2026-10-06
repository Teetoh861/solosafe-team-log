import crypto from "crypto";
import { TEAM, ADMINS } from "./team";

export const MEMBERS = [
  { name: "Inioluwa", email: "ibankole@gosolosafe.net" },
  { name: "Tobi", email: "oolayiwola@gosolosafe.net" },
  { name: "Benedict", email: "bumeozor@gosolosafe.net" },
  { name: "Emmanuel", email: "ejoseph@gosolosafe.net" },
  { name: "Nicholas", email: "nomonubi@gosolosafe.net" },
  { name: "Kelvin", email: "komoluyi@gosolosafe.net" },
];
export { TEAM, ADMINS };

export const adminEmails = (except) =>
  MEMBERS.filter((m) => ADMINS.includes(m.name) && m.name !== except).map((m) => m.email);

export function memberByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return MEMBERS.find((m) => m.email === e) || null;
}

const COOKIE = "sl_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function safeEqual(a, b) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export function isAdmin(name) {
  return ADMINS.includes(name);
}

export function sessionCookie(name) {
  const payload = `${name}.${Date.now() + MAX_AGE * 1000}`;
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// Returns the logged-in team member's name, or null.
export function getUser(req) {
  const header = req.headers.cookie || "";
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const parts = decodeURIComponent(match.slice(COOKIE.length + 1)).split(".");
  if (parts.length !== 3) return null;
  const [name, exp, sig] = parts;
  if (!safeEqual(sig, sign(`${name}.${exp}`))) return null;
  if (Number(exp) < Date.now() || !TEAM.includes(name)) return null;
  return name;
}
