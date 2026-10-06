import nodemailer from "nodemailer";

export const APP_URL = process.env.APP_URL || "https://solosafe-team-log.vercel.app";

let transporter;

export async function sendMail({ to, subject, text }) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev mail] to=${to} subject=${subject}\n${text}`);
      return;
    }
    throw new Error("SMTP_USER / SMTP_PASS are not set");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  await transporter.sendMail({
    from: `"SoloSafe Team Log" <${user}>`,
    to,
    subject,
    text,
  });
}

// Never lets a notification failure break the action that triggered it.
export async function sendMailSafe(msg) {
  try {
    await sendMail(msg);
  } catch (err) {
    console.error("mail failed:", err.message);
  }
}
