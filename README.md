# GTSE Unshipped Orders Monitor

Dashboard and alert system for tracking unshipped BigCommerce orders.

## Features

- **Live Dashboard** — View all orders awaiting shipment
- **Hours Tracking** — See how long each order has been open
- **Overdue Alerts** — Orders exceeding threshold highlighted in warning colors
- **Email Notifications** — Automatic alerts via Resend when orders are overdue
- **Scheduled Checks** — Daily cron job at 15:55 UTC (pre-4pm UK)

## Screenshot

The dashboard displays:
- Total orders awaiting shipment
- Count of orders over threshold
- Configurable threshold (default: 24 hours)
- Direct links to BigCommerce order management

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BIGCOMMERCE_STORE_HASH` | ✅ | Store hash (e.g., `usnceuurb6`) |
| `BIGCOMMERCE_ACCESS_TOKEN` | ✅ | BigCommerce API access token |
| `THRESHOLD_HOURS` | ❌ | Hours before overdue (default: 24) |
| `ALERT_EMAIL` | ✅ | Email address for alerts |
| `RESEND_API_KEY` | ✅ | Resend API key for sending emails |
| `CRON_SECRET` | ❌ | Optional auth for cron endpoint |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deployed on Vercel with automatic deploys from `main` branch.

### Cron Schedule

```json
{
  "crons": [
    {
      "path": "/api/check",
      "schedule": "55 15 * * *"
    }
  ]
}
```

Runs daily at 15:55 UTC — alerts sent if any orders exceed threshold.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Vercel KV (caching)
- Resend (email)
- BigCommerce V2 API

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/orders` | Fetch orders for dashboard |
| `/api/check` | Cron: check overdue orders, send alerts |
| `/api/login` | User authentication |

---

Built for GTSE warehouse operations.
