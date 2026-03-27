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
- The current implementation creates a checkout session for the monthly access product, but subscriber access control still needs a members area or protected content layer.
- If you want true auto-renew billing with unsubscribe handling, confirm PayMongo's current recurring/subscription product support and wire that flow specifically before promising automatic monthly billing on the live site.
- Preventing downloads or screen recording fully usually requires protected hosting or DRM-capable delivery, not just website copy.
