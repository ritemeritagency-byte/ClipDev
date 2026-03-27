# Railway Membership Setup

This project now includes a Railway-ready membership backend shape alongside the existing PayMongo checkout flow.

## What Was Added

- `db/railway-membership-schema.sql`
- `api/_lib/http.js`
- `api/_lib/railway.js`
- `api/memberships/start.js`
- `api/memberships/unsubscribe.js`
- `api/memberships/status.js`

## Recommended Stack

- `Vercel` for the frontend and lightweight serverless endpoints
- `Railway` for the custom backend API
- `Railway Postgres` for member data
- `PayMongo` for checkout and payment events

## Environment Variables

Add these in Vercel when you are ready to connect the site to Railway:

- `RAILWAY_API_BASE_URL`
- `RAILWAY_INTERNAL_SECRET`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `PUBLIC_SITE_URL`

Example:

- `RAILWAY_API_BASE_URL=https://your-railway-app.up.railway.app`
- `RAILWAY_INTERNAL_SECRET=your-shared-internal-token`

## Database Schema

Run this file on your Railway Postgres database:

```text
db/railway-membership-schema.sql
```

It creates:

- `users`
- `subscription_plans`
- `subscriptions`
- `payments`
- `course_access`
- `webhook_events`

## Backend Flow

### 1. Start membership

Frontend or admin flow can call:

```text
POST /api/memberships/start
```

Payload:

```json
{
  "email": "student@example.com",
  "fullName": "Student Name",
  "planCode": "courseClubMonthly"
}
```

That endpoint forwards the request to:

```text
POST {RAILWAY_API_BASE_URL}/api/memberships/start
```

### 2. Unsubscribe

```text
POST /api/memberships/unsubscribe
```

Payload:

```json
{
  "email": "student@example.com"
}
```

or

```json
{
  "subscriptionId": "sub_123"
}
```

### 3. Membership status

```text
GET /api/memberships/status?email=student@example.com
```

This forwards to your Railway API and lets you check if a user still has active access.

## PayMongo Integration Notes

The PayMongo checkout and webhook flow should map into the Railway schema like this:

- create or find the `users` row by email
- create a `subscriptions` row when checkout starts
- mark the subscription `active` when payment succeeds
- create a `payments` row for each paid event
- grant `course_access` while the subscription is active
- revoke `course_access` when the subscription is cancelled or expires

## Suggested Railway API Endpoints

When you build the Railway backend later, these are the cleanest endpoints to support:

- `POST /api/memberships/start`
- `POST /api/memberships/unsubscribe`
- `GET /api/memberships/status`
- `POST /api/paymongo/webhook`

## Important

- This repo now contains the schema and Vercel-side integration points.
- You still need to build the Railway API implementation that talks to Postgres directly.
- If you want login, protected course pages, and account management, the next step is adding auth and session handling on top of this schema.
