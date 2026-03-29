# Railway API

This service is the backend companion for the ClipDevs Vercel site.

It provides the endpoints already expected by the Vercel functions:

- `POST /api/memberships/start`
- `GET /api/memberships/status`
- `POST /api/memberships/unsubscribe`
- `POST /api/paymongo/webhook`
- `GET /api/admin/members`
- `POST /api/admin/revoke`
- `GET /health`

## Environment variables

- `DATABASE_URL`
- `RAILWAY_INTERNAL_SECRET`
- `ADMIN_EMAILS`
- `PORT`
- `PGSSLMODE`

`ADMIN_EMAILS` should be a comma-separated list of admin account emails, for example:

```text
cliperedbagundol@gmail.com,owner@clipdevs.com,team@clipdevs.com
```

The backend also bootstraps `cliperedbagundol@gmail.com` as an admin by default so the admin dashboard can still open if the environment variable is temporarily missing. Keeping the email in `ADMIN_EMAILS` is still recommended for production clarity.

## Local run

```bash
npm install
npm run dev
```

## Deploy target

Create a Railway service rooted at `railway-api/`.

Start command:

```bash
npm start
```

## Database

Run the SQL schema from:

```text
db/railway-membership-schema.sql
```

against your Railway Postgres database before sending traffic to this service.

## Launch check

Before announcing paid access publicly, verify this flow in order:

1. Confirm Vercel env vars exist for `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `RAILWAY_API_URL`, `RAILWAY_INTERNAL_SECRET`, and `PUBLIC_SITE_URL`.
2. Confirm Railway env vars exist for `DATABASE_URL`, `RAILWAY_INTERNAL_SECRET`, and `ADMIN_EMAILS`.
3. Confirm the PayMongo webhook points to your deployed `/api/paymongo/webhook` URL.
4. Create a fresh member account with a test email.
5. Start checkout from `/courses` and complete one real or sandbox payment.
6. Verify the webhook creates an `active` subscription and `active` `course_access` row in Railway.
7. Log in with the same email and verify `/library` unlocks.
8. Log in as `cliperedbagundol@gmail.com` and verify `/admin` shows the member in the dashboard.
9. Test `Revoke Access` from `/admin` and confirm `/library` locks again for that member.

Note: the current library page hides the embedded video in the UI, but the video URL is still present in the page source. If you need real content protection, move the lesson off a public embed and serve it through a protected delivery flow.
