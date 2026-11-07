// A new id on every deployment. It is baked into both the browser bundle and /api/version,
// so an old tab left open can tell that a newer version has been released.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
};

module.exports = nextConfig;
