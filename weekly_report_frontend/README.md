# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- Lightweight: No heavy UI frameworks - uses only vanilla CSS and React
- Modern UI: Clean, responsive design with KAVIA brand styling
- Fast: Minimal dependencies for quick loading times
- Simple: Easy to understand and modify

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open http://localhost:3000 to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

---

## Authentication (Supabase OAuth)

This app uses Supabase Auth with OAuth (Google and optionally Azure). The login flow uses PKCE and a dedicated callback route at `/auth/callback` to reliably establish the session.

Quick checklist:
- Copy `.env.example` to `.env` and set:
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_KEY`
  - `REACT_APP_FRONTEND_URL` (optional; falls back to `window.location.origin`)
- In Supabase Dashboard > Authentication > URL Configuration:
  - Set Site URL to your app base
  - Add Redirect URLs for:
    - `{FRONTEND_URL}/auth/callback`
    - `{FRONTEND_URL}`
  - Add any preview domains you will use with the same two entries
- Start the app and visit `/login`

Flow details:
- Login triggers `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: {FRONTEND_URL}/auth/callback?redirect=<intended>, flowType: 'pkce' }})`.
- `OAuthRouterShim` auto-detects OAuth params anywhere and forwards them to `/auth/callback`.
- `/auth/callback` processes:
  - `?code=` → `exchangeCodeForSession(window.location.href)`
  - Hash tokens (implicit flow) → `setSession({ access_token, refresh_token })`
  - Falls back to `getSession()` and listens to `onAuthStateChange` for late-arriving sessions
- `AuthContext` initializes with `getSession()` and subscribes via `onAuthStateChange` to persist and react to session changes.

Troubleshooting:
- Returned to login after redirect
  - Ensure the exact returned domain + path is listed as a Redirect URL in Supabase
  - Ensure `REACT_APP_FRONTEND_URL` matches the site you’re visiting, or leave it blank to fall back to `window.location.origin`
- Callback error
  - Check console for `[AuthCallback]` logs and URL `error/error_description` params
- Session not persisting
  - Confirm storage is allowed (not blocked by private browsing settings)
  - Verify system clock isn’t severely skewed

See `docs/auth-setup.md` for the full setup and troubleshooting guide.

---

## Role Management (Supabase)

This repo includes a server-side script to set user roles in Supabase:

- Configure environment (server-side only):
  - Copy `.env.example` to `.env.server` and set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Scripts auto-load `.env.server` via dotenv and are never exposed to the frontend.
- Set a role by email:
  - `npm run set-role -- --email user@example.com --role manager`
- Set a role by user id:
  - `npm run set-role -- --user-id <uuid> --role admin`
- Optionally mirror to `public.profiles`:
  - `npm run set-role -- --email user@example.com --role employee --sync-profile`

Security notes:
- Never expose SERVICE ROLE KEYS in frontend code.
- The script uses Supabase Admin API and must be executed in Node.js only.

For detailed guidance and RLS notes, see `docs/roles.md`.

---

## Local Testing: Disable Auth (Feature Flag)

For local UI testing without logging in, you can bypass protected routes by setting:

- `REACT_APP_DISABLE_AUTH=true`

When enabled:
- All routes render without requiring authentication.
- The header shows a "Test Mode" badge.
- A banner warns: "Auth disabled for local testing."

Security note: The default is secure (auth required). Do not enable this flag in production.

---

## Customization

### Colors

The main brand colors are defined as CSS variables in `src/App.css`:

```css
:root {
  --kavia-orange: #E87A41;
  --kavia-dark: #1A1A1A;
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### Components

This template uses pure HTML/CSS components instead of a UI framework. You can find component styles in `src/App.css`. 

Common components include:
- Buttons (`.btn`, `.btn-large`)
- Container (`.container`)
- Navigation (`.navbar`)
- Typography (`.title`, `.subtitle`, `.description`)

---

## Learn More

To learn React, check out the React documentation: https://reactjs.org/

Additional CRA docs:
- Code Splitting: https://facebook.github.io/create-react-app/docs/code-splitting
- Analyzing the Bundle Size: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size
- Making a Progressive Web App: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app
- Advanced Configuration: https://facebook.github.io/create-react-app/docs/advanced-configuration
- Deployment: https://facebook.github.io/create-react-app/docs/deployment
- Build fails to minify: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
