# Supabase Google OAuth Setup (Frontend)

This app uses Supabase Auth with OAuth (Google, optionally Azure). Follow these steps to ensure sign-in completes and the session is established:

## 1) Environment variables

Create `weekly_report_frontend/.env` based on `.env.example` and set:

- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_FRONTEND_URL (optional; when unset the app falls back to `window.location.origin`)
- REACT_APP_API_BASE (optional backend)
- REACT_APP_DISABLE_AUTH=false

Note: Do not commit your `.env`.

## 2) Supabase Auth Redirect URLs

In Supabase Dashboard:
- Authentication > URL Configuration
  - Site URL: set to your app base URL (e.g., `https://your-domain.com`)
  - Redirect URLs (add all that apply):
    - `https://your-domain.com/auth/callback`
    - `https://your-domain.com`
    - Add all preview URLs (e.g., Vercel/Netlify previews):
      - `https://<preview>.vercel.app/auth/callback`
      - `https://<preview>.vercel.app`
      - `https://vscode-internal-*.cloud.kavia.ai:3000/auth/callback` (for preview in this environment)
      - `https://vscode-internal-*.cloud.kavia.ai:3000`

If you see a redirect loop or return to the login screen, it's commonly because the returning URL is not whitelisted.

## 3) Google Provider

Enable Google under Authentication > Providers and add your Google OAuth credentials. Ensure the Authorized redirect URI(s) in Google Cloud Console include:
- `https://your-domain.com/auth/callback`
- Any preview domains as above

## 4) How the app handles OAuth

- Login page triggers `supabase.auth.signInWithOAuth('google')` with `redirectTo={FRONTEND_URL}/auth/callback?redirect=<intended-path>` and `flowType='pkce'`.
- `/auth/callback` route runs:
  - `exchangeCodeForSession(window.location.href)` when `?code=` is present (PKCE flow)
  - If tokens are in the hash (implicit flow), `setSession({ access_token, refresh_token })`
  - Waits for `onAuthStateChange` if needed, then navigates to the `redirect` param (default `/reports/new`).
- `AuthContext` listens to `onAuthStateChange` and `getSession()` on load to persist the session and user.

## 5) Troubleshooting

- Returned to login after Google:
  - Verify the returned URL domain and path is listed in Supabase Redirect URLs.
  - Ensure `REACT_APP_FRONTEND_URL` matches the domain you are visiting (including protocol and port), or leave it blank to fall back to `window.location.origin`.
  - Ensure your browser allows third-party cookies and localStorage for the site.

- Callback shows an error:
  - Check OAuth error query/hash parameters; use browser console (we log `[AuthCallback]` details).
  - Confirm Supabase project URL / key are correct and belong to the same project/environment.

- Session not persisting:
  - Confirm `persistSession` is enabled (it is by default in our `supabaseClient`).
  - Ensure not using private/incognito with blocked storage.
  - Confirm time skew (system clock) is reasonable.

## 6) Local/Preview reminders

- Add your local/preview origin to Supabase Redirect URLs before attempting sign-in.
- If hosting with client-side routing, ensure your host serves `index.html` with rewrites for all routes, including `/auth/callback`.
