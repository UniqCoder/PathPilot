# PathPilot

PathPilot is a production-oriented Next.js App Router platform that generates AI-powered career-risk reports, stores user history in Supabase, and supports premium unlocks via Razorpay.

## Current Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Supabase Auth + Postgres (RLS-enabled tables for profiles/reports/payments/battles)
- Razorpay checkout + signature verification + webhooks
- Upstash Redis + `@upstash/ratelimit` for abuse protection
- Resend for transactional emails
- PostHog for product analytics
- `@react-pdf/renderer` for report export
- `react-hot-toast` for global feedback
- Vitest for unit tests

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and fill values:

```bash
cp .env.example .env.local
```

3. Run Supabase SQL migration (from `supabase/migrations/001_init.sql`) in your Supabase project.

4. Start development server:

```bash
npm run dev
```

5. Validate build:

```bash
npm run build
```

## Required Environment Variables

See `.env.example` for the full list.

Critical keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

## Core Product Flows

- Auth:
  - Email/password sign up and sign in at `/auth`
  - Protected app routes via `middleware.ts`
- Report generation:
  - Intake form posts to `/api/generate-report`
  - Reports persist in Supabase and are accessible from `/dashboard`
- Payments:
  - Create order: `/api/payments/create-order`
  - Verify signature: `/api/payments/verify`
  - Token status: `/api/payments/status`
  - Webhook updates: `/api/payments/webhook`
- Battle mode:
  - Create/join/result routes under `/battle/*`
- Export:
  - PDF export endpoint: `/api/export/pdf`

## Important Routes

- `/` landing
- `/auth` login/signup
- `/intake` report intake
- `/report` active report view
- `/dashboard` saved reports history
- `/battle` battle mode

## Testing

```bash
npm test
```

## Deployment

- `vercel.json` is included for Vercel deployment defaults.
- Ensure all environment variables are configured in Vercel project settings.
- Run `npm run build` locally before deploy.

## Troubleshooting

- Error: `Supabase browser env is missing`
  - Ensure these are set in `.env.local`:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (required for server/admin routes)
  - Restart the dev server after updating env values.
