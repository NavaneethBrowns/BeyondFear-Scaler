# BeyondFear: Unlock Your True Self

> A conversational action-tracking platform to help users identify fear patterns and move from reflection to practical action.

![Version](https://img.shields.io/badge/version-1.0.0--mvp-blue)
![Stack](https://img.shields.io/badge/stack-MERN-green)
![License](https://img.shields.io/badge/license-MIT-red)

---

## Quick Overview

BeyondFear focuses on one key problem: many wellness apps increase awareness but do not support consistent action.

Current MVP capabilities:
- Guided fear conversation powered by Gemini.
- Session-based chat with progress context.
- Action log tracking (create, update, complete).
- Dashboard metrics and intensity trends.
- Razorpay test-mode subscription flow.
- Clear free-vs-premium rules.

---

## Current Access Rules

- Free users can create one chat session and continue it.
- Creating additional chats requires premium.
- Incognito chat requires premium.
- Rename and delete chat require premium.

---

## Tech Stack

Backend:
- Node.js + Express
- MongoDB + Mongoose
- JWT auth middleware
- Gemini API integration
- Razorpay payments

Frontend:
- React + TypeScript
- TanStack Start + TanStack Router
- Tailwind CSS + UI component primitives

---

## Quick Start

### Prerequisites

- Node.js 22+ recommended for frontend build consistency.
- MongoDB Atlas cluster.
- Gemini API key.
- Razorpay test keys.

### 1) Install dependencies

```bash
git clone https://github.com/NavaneethBrowns/BeyondFear-Scaler.git
cd BeyondFear-Scaler

cd backend && npm install
cd ../frontend && npm install
```

### 2) Backend environment

Create `backend/.env.local` and fill:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/beyondfear-dev
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-flash-latest

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxxxxxxxxxxxxx
PAYMENT_PROVIDER=razorpay

JWT_SECRET=your_random_32_plus_char_secret
JWT_EXPIRE=7d

NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3) Frontend environment

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4) Run locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

---

## API Base URLs

Local:
- `http://localhost:5000/api`

Deployed backend (Render):
- `https://beyondfear-scaler.onrender.com/api`

Health check:
- `https://beyondfear-scaler.onrender.com/health`

Note: `GET /api` returning `{"error":"Endpoint not found"}` is expected because only specific `/api/*` routes are implemented.

---

## Routes (Current)

Auth:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `POST /api/auth/logout`

Sessions:
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:id`
- `PUT /api/sessions/:id`
- `DELETE /api/sessions/:id`
- `PATCH /api/sessions/:id/complete`
- `PATCH /api/sessions/:id/intensity`

Messages:
- `POST /api/messages/:sessionId`

Action logs:
- `GET /api/sessions/:sessionId/action-logs`
- `POST /api/sessions/:sessionId/action-logs`
- `PATCH /api/sessions/:sessionId/action-logs/:actionLogId`

Payments:
- `POST /api/payments/create-order`
- `POST /api/payments/verify`
- `POST /api/payments/verify-payment`
- `GET /api/payments/status`
- `GET /api/payments/plans`
- `POST /api/payments/record-failure`

Dashboard:
- `GET /api/dashboard/summary`

---

## Payment Testing (Razorpay Test Mode)

Use test card:
- Card: `4111 1111 1111 1111`
- Expiry: any future date
- CVV: any 3 digits

Test flow:
1. Sign up and create first session.
2. Attempt additional chat creation.
3. Upgrade modal appears.
4. Complete Razorpay test payment.
5. Verify premium unlock.

---

## Deployment

Recommended setup:
- Backend: Render Web Service (root directory `backend`).
- Frontend: Netlify (base directory `frontend`).
- Database: MongoDB Atlas.

### Render backend settings

- Build command: `npm install`
- Start command: `npm start`

Important env values:
- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-netlify-site>.netlify.app`
- `MONGODB_URI` and other secrets

### Netlify frontend settings

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

Required env value:
- `VITE_API_URL=https://beyondfear-scaler.onrender.com/api`

Recommended build env:
- `NODE_VERSION=22`

---

## Security Notes

- Never commit `.env` or `.env.local`.
- Keep Razorpay secret only on backend.
- Use JWT with strong random secret.
- Restrict CORS using `FRONTEND_URL`.
- Rotate any leaked keys immediately.

---

## Troubleshooting

Mongo connection fails on Render:
- In Atlas Network Access, allow `0.0.0.0/0` for deployment.
- Ensure `MONGODB_URI` contains a database name and valid credentials.

CORS errors:
- Set backend `FRONTEND_URL` to your deployed Netlify domain and redeploy.

Frontend cannot call backend:
- Confirm `VITE_API_URL` is set and frontend is redeployed.

---

## Project Status

This repository currently contains both backend and frontend production-ready MVP code for:
- Auth
- Chat sessions
- Action logs
- Dashboard summary
- Subscription and payment flow

---

## Reviewer Notes

- This project is deployed and usable end-to-end.
- Payments are configured in Razorpay test mode for safe evaluation.
- `GET /api` returning `{"error":"Endpoint not found"}` is expected; please use documented route paths.

---

## Useful Links

- Backend API base: `https://beyondfear-scaler.onrender.com/api`
- Backend health: `https://beyondfear-scaler.onrender.com/health`
- API docs in repo: `docs/API_SPEC.md`
- Data model docs in repo: `docs/DATA_MODEL.md`

---

## License

MIT
