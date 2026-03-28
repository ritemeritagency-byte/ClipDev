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
owner@clipdevs.com,team@clipdevs.com
```

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
