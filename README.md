# ClipDevs

ClipDevs is a marketing site, member area, and lightweight commerce stack for recruitment and service businesses.
The repo combines:

- Static pages for the public website
- Vercel serverless API routes under [`api/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/api)
- Shared browser and server utilities under [`lib/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/lib)
- A Railway-backed Express API under [`railway-api/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/railway-api)

## Project Structure

- [`index.html`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/index.html) and the other `*.html` files are the public-facing pages.
- [`style.css`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/style.css) contains the shared site styles.
- [`script.js`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/script.js) is the browser entrypoint and now delegates to page-focused modules in [`assets/js/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/assets/js).
- [`api/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/api) contains the Vercel API handlers that proxy auth, membership, admin, and payment actions.
- [`railway-api/server.js`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/railway-api/server.js) is the Railway Express bootstrap. Route logic lives in [`railway-api/routes/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/railway-api/routes) and shared backend logic lives in [`railway-api/lib/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/railway-api/lib).

## Local Setup

### Website / Vercel layer

Serve the root of this repo with any static server or through Vercel local development.
Important environment variables used by the Vercel API routes:

- `RAILWAY_API_BASE_URL`
- `RAILWAY_INTERNAL_SECRET`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `BUNNY_LIBRARY_ID`
- `BUNNY_STREAM_API_KEY`
- `GOOGLE_SHEET_WEBHOOK_URL`

### Railway API

From [`railway-api/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/railway-api):

```bash
npm install
npm run dev
```

Important Railway API environment variables:

- `DATABASE_URL`
- `PORT`
- `RAILWAY_INTERNAL_SECRET`
- `ADMIN_EMAILS`

## Quality Checks

From [`railway-api/`](/Users/cliperedbagundol/Library/Mobile%20Documents/com~apple~CloudDocs/clipdev/railway-api):

```bash
npm run lint
npm test
npm run check
```

`lint` uses a dependency-free syntax check over the Railway API source and tests.
`test` uses Node's built-in test runner for lightweight smoke coverage.

## Current Architecture Notes

- Public pages remain plain HTML/CSS with a shared JavaScript entrypoint.
- The browser code is now grouped by concerns:
  - `experience.js` for navigation, animation, showcase, and widget behavior
- `commerce.js` for payments, offers, paywall, and membership flows
- `auth.js` for signup, login, account, admin, and member library behavior
- `forms.js` for lead forms and CTA tracking
- `search.js` for site search
- Form submissions now proxy through `/api/forms/submit`, which forwards to the Google Sheets webhook from server-side config.
- The Railway API is split by route area:
  - `health`
  - `auth`
  - `admin`
  - `memberships`
  - `offers`
  - `paymongo`

## Next Improvements

- Break `style.css` into base, layout, component, and page files.
- Add integration tests around the Vercel proxy routes.
- Replace hardcoded operational values with environment-driven configuration where possible.
