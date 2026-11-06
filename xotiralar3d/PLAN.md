# Xotiralar 3D — deployment and backend

The supported deployment runs entirely on Netlify. Vite serves the existing 3D interface, Netlify Identity handles email/password accounts, Netlify Database stores application records, and Netlify Blobs stores uploaded images. The frontend no longer needs Supabase credentials or a separate Python API server.

## Deployment

Deploy the `xotiralar3d` base directory with the existing `npm run build` command and `dist` publish directory. Functions are in `netlify/functions`. Database tables are defined in `db/schema.ts`; generated migrations in `netlify/database/migrations` are applied by the platform during deployment. Do not manually apply them.

Identity has been enabled. New accounts require email confirmation. The frontend handles confirmation callbacks automatically. New users receive their own house and three rooms on their first authenticated API request.

Existing Supabase accounts and data are not imported. Users create a new Identity account for this backend. Existing Supabase resources are not modified.

## Administrator

In the Netlify dashboard, open Identity, select the intended user, and add the `admin` role. Only verified Identity roles grant administrator access. User-editable metadata cannot grant permissions. Administrators can manage songs, news, complaints, and account bans.

## Telegram

Set `BOT_TOKEN` as a secret server environment variable. Never use a `VITE_` prefix for bot credentials. The published deployment registers `https://memroom.netlify.app/api/telegram` with Telegram automatically within five minutes, using a signed webhook secret. Previews do not register or replace the production webhook. Private `/start` messages receive the Mini App button.

Do not run the old `backend/bot.py` polling process alongside the webhook. The old Python backend is retained as legacy source and is not required by this deployment. The webhook opens the site; site login remains email/password authentication.

## Local checks

Run `npm test` for webhook/security smoke tests and `npm run check` for server type checks. Use `netlify dev --port 8889` for local Netlify service emulation. Database and Identity integration need the corresponding Netlify runtime; plain `vite` does not emulate them.

## Data and access

Public houses can be browsed without login. Hidden houses and their images require their owner or an administrator. All writes require an authenticated, unblocked account; ownership and admin permissions are enforced on the server. Room edits are serialized in database transactions. Unique house visits, votes, guestbook messages, wishes, notifications, reports, and audit records are persisted in Postgres. Images accept PNG, JPEG, and WebP up to 3 MB. Achievement badges are derived from persisted activity.
