import { kv } from "@vercel/kv";
import { sendMail } from "./mail";
import crypto from "crypto";
import { memberByEmail, sign, safeEqual } from "./auth";

const TTL = 600; // code valid for 10 minutes
const MAX_ATTEMPTS = 5;

const hashCode = (email, code) => sign(`otp:${email}:${code}`);

// Silent no-op for emails that aren't on the team list.
export async function requestCode(rawEmail) {
  const member = memberByEmail(rawEmail);
  if (!member) return;
  const email = member.email;

  if (await kv.get(`solosafe:otp:cool:${email}`)) return; // one code per minute
  await kv.set(`solosafe:otp:cool:${email}`, 1, { ex: 60 });
  const count = await kv.incr(`solosafe:otp:rl:${email}`);
  if (count === 1) await kv.expire(`solosafe:otp:rl:${email}`, 3600);
  if (count > 6) return; // max 6 codes per hour

  const code = String(crypto.randomInt(100000, 1000000));
  await kv.set(`solosafe:otp:${email}`, { hash: hashCode(email, code), attempts: 0 }, { ex: TTL });
  await sendMail({
    to: email,
    subject: `Your SoloSafe Team Log code: ${code}`,
    text: `Your sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
  });
}

// Returns the member's name if the code is right, otherwise null.
export async function verifyCode(rawEmail, rawCode) {
  const member = memberByEmail(rawEmail);
  if (!member) return null;
  const key = `solosafe:otp:${member.email}`;
  const rec = await kv.get(key);
  if (!rec) return null;
  if (rec.attempts >= MAX_ATTEMPTS) {
    await kv.del(key);
    return null;
  }
  const code = String(rawCode || "").replace(/\s/g, "");
  if (!safeEqual(rec.hash, hashCode(member.email, code))) {
    await kv.set(key, { ...rec, attempts: rec.attempts + 1 }, { keepTtl: true });
    return null;
  }
  await kv.del(key);
  return member.name;
}
