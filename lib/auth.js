import crypto from "crypto";

export const TEAM = ["Inioluwa", "Tobi", "Benedict", "Emmanuel", "Nicholas", "Kelvin"];
export const ADMINS = ["Inioluwa", "Tobi"];

const COOKIE = "sl_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a, b) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export function isAdmin(name) {
  return ADMINS.includes(name);
}

export function checkCode(name, code) {
  if (!TEAM.includes(name) || typeof code !== "string") return false;
  let codes = {};
  try {
    codes = JSON.parse(process.env.TEAM_CODES || "{}");
  } catch {
    return false;
  }
  const expected = codes[name];
  if (!expected) return false;
  return safeEqual(String(expected).toUpperCase(), code.trim().toUpperCase());
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
