# PathPilot

AI-powered career survival platform for Indian college students navigating the AI disruption era.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Add your Gemini API key in `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

3. Start the dev server:

```bash
npm run dev
```

4. Optional: build for production check:

```bash
npm run build
```

## Launch and Debug in VS Code

1. Open the integrated terminal and run:

```bash
npm run dev
```

2. Open `http://localhost:3000` in your browser.
3. For step-through debugging, use a JavaScript Debug Terminal and run the same command.

## Key Routes

- `/` Landing page
- `/intake` 5-step intake form
- `/report` Report page (reads session data)
- `/battle` Battle intake mode
- `/battle/join/[battleId]` Join a battle room
- `/battle/results/[battleId]` Battle results + unlock flow
- `/api/generate-report` Gemini-powered report generator
- `/api/battle/create` Create a battle entry
- `/api/battle/[battleId]` Read/update a battle
- `/api/battle/[battleId]/join` Join an existing battle
- `/api/payments/create-order` Razorpay order creation endpoint
- `/api/payments/verify` Razorpay payment signature verification
- `/api/payments/status` Token-based unlock status check
- `/api/payments/webhook` Razorpay webhook receiver

## Data

- `data/market_signals.json` Weekly market signals injected into the prompt
- `data/payment_records.json` Verified payment and unlock records

## Notes

- If `GEMINI_API_KEY` is missing, the API returns a demo report for UI testing.
- If Razorpay keys are missing, checkout runs in mock-success mode for UI testing.
- Verified payments are stored in `data/payment_records.json`.
- Webhook events are written to `data/payment_webhooks.json` when webhook callbacks are received.
- Unlock tokens are issued only after server verification and captured payment confirmation.
- Expiry rules: Battle Report `30 days`, Full Roadmap `365 days`, Shadow You `30 days`.
