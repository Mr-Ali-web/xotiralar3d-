# Multi-user 3D Virtual House Platform — Plan

## Phase 1: Database (Supabase)
- For a new project, run `supabase/schema.sql` once.
- For an existing project, run `supabase/migrations/20261106161908_enforce_active_user_rls.sql`.
- Enable email/password authentication in Supabase.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.example` for local development and in Netlify environment variables.
- To enable the admin panel, promote the intended user after signing up in the Supabase SQL editor:
  `update public.profiles set role='admin' where id=(select id from auth.users where email='admin@example.com');`

## Phase 2: Auth
- Supabase email/password authentication; configure email confirmation and the site's redirect URL in Supabase.
- Signup trigger creates the profile, house, and its three initial rooms.

## Phase 3: Frontend
- 3D scene uses Supabase for authentication, house/room/stand data, guestbook, wishes, votes, news, songs, notifications, and admin actions.

## Phase 4: Security
- RLS policies enforce ownership and reject writes from banned accounts.
- Validate user input and uploaded image type/size.
- Secret rooms are not implemented; do not rely on a client-side or shared PIN.

## Phase 5: Deploy
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify and build from `xotiralar3d/`.
- Set the Telegram bot's `MINI_APP_URL` to the deployed HTTPS site.
- The bot only opens the web app; account authentication and app data use Supabase directly.
- PWA manifest is not implemented.

## Local setup
- Apply `supabase/schema.sql` once to a new Supabase project.
- Copy `xotiralar3d/.env.example` to `xotiralar3d/.env`, then set the Supabase project URL and anon key.
- Copy `backend/.env.example` to `backend/.env`, then set the Telegram bot token and deployed HTTPS app URL.
- Run the frontend from `xotiralar3d/` with `npm install` and `npm run dev`.
- Run the bot from `backend/` with `python bot.py`.
