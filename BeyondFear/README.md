# BeyondFear: Unlock Your True Self

> A conversational action-tracking platform to help you identify, unpack, and dissolve personal fears through guided dialogue and structured action steps.

![Version](https://img.shields.io/badge/version-1.0.0--mvp-blue)
![Stack](https://img.shields.io/badge/stack-MERN-green)
![License](https://img.shields.io/badge/license-MIT-red)

---

## 🎯 Quick Overview

**The Problem:** Most mental health apps make you *aware* of your patterns but don't help you *act* on them.

**Our Solution:** BeyondFear bridges the gap between awareness and action by:
- 🗣️ **Conversational Discovery**: AI guide helps you reverse-engineer the root cause of your fear
- 🎯 **Clear Direction**: Transform vague anxiety into a specific first step
- ✅ **Action Tracking**: Create micro-commitments and track progress
- 📊 **Insights Dashboard**: Visualize your fear intensity trends
- 🔐 **Privacy First**: Encrypted sessions, anonymous by design
- 🎓 **Graduation Model**: Help you become independent of the app

---

## 🚀 Quick Start (5 minutes)

**📋 See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) for security best practices and sharing with teammates.**

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **MongoDB** (free account: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Claude API Key** (free: [Anthropic Console](https://console.anthropic.com/keys))
- **Razorpay Test Account** (free: [Razorpay](https://razorpay.com/sign-up))

### Step 1: Clone & Install

```bash
git clone https://github.com/NavaneethBrowns/BeyondFear-Scaler.git
cd BeyondFear-Scaler

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Step 2: Get Free API Keys

**MongoDB:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account → Create cluster (M0 free tier)
3. Copy connection string: `mongodb+srv://user:password@cluster.mongodb.net/beyondfear-dev`

**Claude API:**
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create account → API Keys
3. Copy key: `sk-ant-...`

**Razorpay Test Account:**
1. Sign up at [Razorpay](https://razorpay.com/sign-up)
2. Go to Settings → API Keys
3. Copy test keys (starts with `rzp_test_`)

### Step 3: Configure Environment

**Backend Setup:**
```bash
cd backend
cp .env.example .env.local

# Edit .env.local with your keys
# Windows: notepad .env.local
# Mac/Linux: nano .env.local
```

Fill in these values:
```
MONGODB_URI=mongodb+srv://your-user:your-pass@cluster.mongodb.net/beyondfear-dev
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxxxxxxxxxxxxx
JWT_SECRET=your-random-secret-32-chars-minimum
```

**Frontend Setup:**
```bash
cd ../frontend
cp .env.example .env.local

# Edit with your public keys
```

Fill in:
```
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

### Step 4: Start Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App running on http://localhost:5173
```

Open browser → `http://localhost:5173`

---

## 💳 Payment Testing

### Test Card Numbers

| Provider | Card | Expiry | CVV |
|----------|------|--------|-----|
| **Razorpay** | 4111 1111 1111 1111 | Any future date | Any 3 digits |
| **Stripe** | 4242 4242 4242 4242 | Any future date | Any 3 digits |

### Test Payment Flow

1. Sign up → Get 3 free sessions
2. Try to create a 4th session → Payment wall appears
3. Click "Subscribe" → Razorpay payment modal opens
4. Enter test card details above
5. Payment succeeds → Sessions unlocked

---

## 📂 Project Structure

```
BeyondFear-Scaler/
├── backend/
│   ├── src/
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── User.js
│   │   │   ├── Session.js
│   │   │   └── Payment.js
│   │   ├── routes/           # Express routes
│   │   │   ├── sessions.js
│   │   │   ├── payments.js
│   │   │   └── auth.js
│   │   ├── services/         # Business logic
│   │   │   ├── claudeService.js
│   │   │   ├── paymentService.js
│   │   │   └── encryptionService.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── server.js         # Entry point
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Session.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── PaymentSuccess.jsx
│   │   ├── components/
│   │   │   ├── SessionForm.jsx
│   │   │   ├── ConversationThread.jsx
│   │   │   ├── ProgressChart.jsx
│   │   │   └── PaymentModal.jsx
│   │   ├── hooks/
│   │   │   ├── useSession.js
│   │   │   └── usePayment.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── API_SPEC.md          # All endpoints
│   ├── DATA_MODEL.md        # Database schema
│   └── DEPLOYMENT.md        # Production setup
│
├── ENV_SETUP_GUIDE.md       # This file
├── .gitignore
└── README.md
```

---

## 🔄 API Endpoints (Quick Reference)

### Sessions (Fears & Dialogues)
- `POST   /api/sessions`              - Create new session
- `GET    /api/sessions/:id`          - Get session details
- `POST   /api/sessions/:id/messages` - Send message, get AI response
- `PATCH  /api/sessions/:id/complete` - Mark session complete
- `GET    /api/sessions`              - List user's sessions
- Free tier includes 1 session; additional sessions require subscription.

### Action Logs
- `GET    /api/sessions/:sessionId/action-logs` - List tracked mini-actions
- `POST   /api/sessions/:sessionId/action-logs` - Create an action log
- `PATCH  /api/sessions/:sessionId/action-logs/:actionLogId` - Update action status

### Payments
- `POST   /api/payments/create-order`   - Start payment
- `POST   /api/payments/verify`         - Verify & unlock sessions
- `GET    /api/payments/history`        - Payment history
- `POST   /api/payments/webhook`        - Razorpay webhook

### Authentication
- `POST   /api/auth/register` - Sign up
- `POST   /api/auth/login`    - Log in
- `GET    /api/auth/me`       - Current user

---

## 🎨 UI/UX - Mobile-First Design

### Breakpoints
- **Mobile:** < 768px (default, optimized)
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Pages

**1. Landing/Home**
- Hero: "Unlock Your True Self"
- Value prop + CTA
- Mobile: Full width, centered
- Desktop: Sidebar nav + content

**2. Sign Up / Log In**
- Simple form
- Mobile: Bottom input bar
- Desktop: Centered card

**3. Fear Entry**
- Text area: "Describe your fear..."
- Smart placeholder guidance
- Mobile: Full screen input
- Desktop: Modal or side panel

**4. Conversation View**
- Thread display (scrollable)
- Message input at bottom
- Mobile: Full screen, bottom sticky input
- Desktop: Max-width container, centered

**5. Dashboard**
- Session count card
- Fear intensity chart (line graph)
- Recent sessions list
- Mobile: Vertical stack
- Desktop: Grid layout

**6. Payment**
- Free sessions counter
- "Upgrade" button
- Razorpay modal (full screen on mobile)

---

## 🔐 Security & Privacy

### Credentials
- **NEVER** commit `.env` or real API keys
- Use `.env.local` for local development
- `.env.example` has placeholders only

### Data Protection
- Passwords: Hashed with bcrypt
- JWT tokens: Signed, 7-day expiry
- Transcripts: Encrypted with Node crypto (optional)
- Payments: PCI-compliant via Razorpay

### Best Practices
- Use test credentials for development
- Rotate keys after MVP launch
- Monitor Claude API usage (free tier: $5/month)
- Use MongoDB free tier during development (upgrade before production)

---

## 📊 Deployment Strategy

### Local Development
- Backend: `npm run dev` (port 5000)
- Frontend: `npm run dev` (port 5173)

### Staging (Before Submission)
- **Backend:** Deploy to Railway.app (free tier)
- **Frontend:** Deploy to Vercel (free tier)
- **Database:** MongoDB Atlas (free tier)

### Production (Post-MVP)
- Backend → Railway / Render
- Frontend → Vercel
- Database → MongoDB Atlas (paid)
- CDN → Cloudflare (free)

---

## 🧪 Testing Payment Integration

### Razorpay Test Flow
1. Create order → `/api/payments/create-order`
2. User sees modal with test card input
3. Enter test card → Razorpay processes
4. Verify signature → `/api/payments/verify`
5. Unlock sessions on success

### Monitoring
- Check Razorpay dashboard: Settings → Test Mode
- See all test transactions (no real money)
- Monitor error rates and payment success %

---

## 🚢 Production Deployment

Before going live:
- [ ] Switch to production Razorpay keys
- [ ] Enable encryption for transcripts
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production domain
- [ ] Set up SSL certificates
- [ ] Test payment with real card (small amount)
- [ ] Monitor errors via logging service

---

## 📝 Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | Database connection | `mongodb+srv://...` |
| `ANTHROPIC_API_KEY` | Claude AI | `sk-ant-...` |
| `RAZORPAY_KEY_ID` | Payment public key | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Payment secret | `rzp_test_...` |
| `JWT_SECRET` | Auth token secret | 32+ random chars |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |

---

## 🐛 Troubleshooting

### "Cannot find module 'express'"
```bash
# Make sure you ran npm install
cd backend && npm install
```

### "MONGODB_URI is not defined"
```bash
# Create .env.local file
cp .env.example .env.local
# Edit with your MongoDB connection string
```

### Claude API returns 401 error
```bash
# Check API key is valid and not expired
# Verify key starts with "sk-ant-"
# Create new key: https://console.anthropic.com
```

### Razorpay payment fails with "Invalid key"
```bash
# Verify using TEST keys (rzp_test_)
# Production keys (rzp_live_) won't work in test mode
```

### CORS errors in frontend
```bash
# Backend: Check FRONTEND_URL in .env.local matches dev server
FRONTEND_URL=http://localhost:5173
```

---

## 📚 Additional Resources

- **API Documentation:** See `docs/API_SPEC.md`
- **Database Schema:** See `docs/DATA_MODEL.md`
- **Deployment Guide:** See `docs/DEPLOYMENT.md`
- **Anthropic Docs:** https://docs.anthropic.com
- **Razorpay Docs:** https://razorpay.com/docs

---

## 🤝 Contributing

This is a solo Scaler capstone project. Feedback welcome! 

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎓 Scaler Capstone Info

**Project:** BeyondFear (Mental Wellness, MERN Stack)
**Duration:** 2 weeks
**Submission:** Before August 8, 2026
**Tech Stack:** Node.js, Express, React, MongoDB, Claude AI, Razorpay

---

## ✅ Pre-Submission Checklist

- [ ] All `.env` files are `.local` or `.example` (not in git)
- [ ] Payment flow works end-to-end
- [ ] Responsive design tested on mobile (DevTools)
- [ ] Claude dialogue generates meaningful responses
- [ ] Session data persists after refresh
- [ ] Dashboard shows accurate metrics
- [ ] No console errors in production mode
- [ ] README updated with setup instructions
- [ ] GitHub repo is public (submit link)
- [ ] ZIP exported with proper folder structure
- [ ] PDF report completed (based on WOOLF template)

---

**Ready to build? Start with backend setup above.** 🚀
