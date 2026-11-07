// Returns the id of the deployment that is currently live (see next.config.js).
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ version: process.env.NEXT_PUBLIC_BUILD_ID });
}
