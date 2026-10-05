# SoloSafe Team Log

A shared daily/weekly update and blocker log for the SoloSafe team — built to replace a spreadsheet with something people actually want to open.

## What it does

- Anyone on the team picks their name, picks **Daily**, **Weekly**, or **Blocker**, and fills in a short form.
- Entries show up immediately in a feed below, grouped by day, newest first.
- Filter the feed by person or type.
- Data is shared across everyone — not per-browser, not per-device.

## Deploying this on Vercel

### 1. Push this project to GitHub
Create a new repo and push this folder's contents to it (or upload it directly if your Vercel account supports drag-and-drop deploy).

### 2. Import the project into Vercel
From your Vercel dashboard: **Add New → Project**, then select the repo. Leave the default settings (Framework Preset should auto-detect as **Next.js**).

### 3. Add a Vercel KV store (this is the important step)
This app needs somewhere to actually store entries. Vercel KV is Vercel's own built-in storage and takes about a minute to set up:

1. In your new project's dashboard, go to the **Storage** tab.
2. Click **Create Database → KV**.
3. Give it a name (e.g. `solosafe-log`) and create it.
4. Vercel will ask which projects to connect it to — connect it to this one.
5. This automatically adds the required environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.) to your project. You don't need to copy/paste anything yourself.

### 4. Redeploy
If you added the KV store after the first deploy, trigger a redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new environment variables take effect.

### 5. Done
Your app will be live at the `.vercel.app` URL Vercel gives you (or a custom domain if you add one). Share that link with the team — no login required, anyone with the link can log an entry.

## Editing the team list

The list of names (and who can be selected as "escalated to") is hardcoded in two places for simplicity:
- `pages/api/entries.js` — the `TEAM` array (used for validation)
- `pages/index.js` — the `TEAM` array (used for the dropdowns)

Update both if someone joins or leaves the team.

## Local development

```bash
npm install
npm run dev
```

Note: locally, API calls will fail unless you also set up Vercel KV env vars locally (`vercel env pull` after linking the project with `vercel link`). Easiest to just test directly on the deployed Vercel URL.
