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

## Backend API Configuration

The frontend integrates with a backend API. Configure the base URL using environment variables:
- REACT_APP_API_BASE (preferred)
- REACT_APP_BACKEND_URL (fallback)
- If neither is set, the app defaults to https://digitalt3-weekly-report-platform-1.kavia.app

Example `.env` (frontend):
```
REACT_APP_API_BASE=https://your-backend.example.com
```

All frontend API calls go through the centralized client in `src/services/apiClient.js`, which:
- Uses the base URL above
- Attaches Authorization: Bearer <token> when a Supabase/Google access token is available
- Sends JSON requests by default

Note: No hard-coded URLs exist in components; they consume the API client and service modules.

## Authentication and Tokens

The app uses Supabase for authentication. The API client obtains the token via `supabase.auth.getSession()` and sends it as a Bearer token for backend requests.

If your backend expects a Google ID token instead of an access token, update `getAuthToken()` in `src/services/apiClient.js` to retrieve and supply that token.

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

## Local Testing: Disable Auth (Feature Flag)

For local UI testing without logging in, you can bypass protected routes by setting the following environment variable before starting the dev server:

- REACT_APP_DISABLE_AUTH=true

When enabled:
- All routes render without requiring authentication.
- The header shows a "Test Mode" badge.
- A banner warns: "Auth disabled for local testing."

Security note: The default is secure (auth required). Do not enable this flag in production.

## Learn More

To learn React, check out the React documentation: https://reactjs.org/
