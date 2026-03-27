# PayMongo Setup

This project now includes serverless backend endpoints for PayMongo checkout on Vercel.

## Files

- `api/paymongo/create-checkout.js`
- `api/paymongo/webhook.js`
- `api/paymongo/catalog.js`

## Environment Variables

Add these in Vercel project settings:

- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `PUBLIC_SITE_URL`

Example:

- `PAYMONGO_SECRET_KEY=sk_test_...`
- `PAYMONGO_WEBHOOK_SECRET=whsk_...`
- `PUBLIC_SITE_URL=https://www.clipdevs.com`

## Current Product Map

Edit `api/paymongo/catalog.js` to change:

- course names
- descriptions
- PHP amounts in centavos
- allowed payment methods

Examples:

- `99900` = PHP 999.00
- `299900` = PHP 2,999.00

## Frontend Flow

Course buttons on `courses.html` call:

- `POST /api/paymongo/create-checkout`

Payload:

```json
{
  "courseId": "flagshipCourseOneTime"
}
```

The backend creates a PayMongo Checkout Session and redirects the buyer to PayMongo.

## Webhook URL

Create a PayMongo webhook pointing to:

```text
https://www.clipdevs.com/api/paymongo/webhook
```

Use this for completed payment events so you can later:

- unlock course access
- send buyer email follow-up
- log paid enrollments
- sync orders to Google Sheets or a database

## Important Notes

- The backend currently creates checkout sessions but does not yet store orders in a database.
- The webhook currently verifies the request and logs the event.
- If PayMongo is not configured yet, the frontend falls back to WhatsApp.
- Recurring subscription logic may need a separate PayMongo subscription flow if you want true auto-renew billing instead of a one-time monthly payment.
