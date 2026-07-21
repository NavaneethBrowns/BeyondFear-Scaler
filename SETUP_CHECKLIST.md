# BeyondFear: Setup Checklist & Project Overview

**Status:** Project structure & documentation ready for Day 1 implementation  
**Last Updated:** 2026-07-18  
**Timeline:** 2 weeks (Before Aug 8, 2026)

---

## ✅ Pre-Implementation Checklist

### Environment & Credentials (Do This First)

- [ ] **MongoDB Atlas Free Tier**
  - [ ] Create account: https://www.mongodb.com/cloud/atlas
  - [ ] Create M0 free cluster
  - [ ] Get connection string: `mongodb+srv://...`
  - [ ] Add IP allowlist (0.0.0.0/0 for dev)
  - [ ] Create `beyondfear-dev` database

- [ ] **Claude API Key**
  - [ ] Create account: https://console.anthropic.com
  - [ ] Create API key
  - [ ] Copy key: `sk-ant-...`
  - [ ] Verify free tier ($5/month)

- [ ] **Razorpay Test Account**
  - [ ] Sign up: https://razorpay.com
  - [ ] Enable test mode
  - [ ] Copy test keys: `rzp_test_...`
  - [ ] Save secret key securely

### Local Setup

- [ ] Clone repository to `C:\Users\Public\Extern\BeyondFear-Scaler`
- [ ] Copy backend: `backend/.env.example` → `backend/.env.local`
- [ ] Copy frontend: `frontend/.env.example` → `frontend/.env.local`
- [ ] Fill in API keys in `.env.local` files (NOT `.example`)
- [ ] Verify `.gitignore` includes `.env.local` (no commits!)
- [ ] `npm install` in backend and frontend directories

---

## 📁 Project Structure (Created)

```
✅ BeyondFear-Scaler/
  ├── ✅ README.md                          (Comprehensive setup guide)
  ├── ✅ .gitignore                          (Secure: no .env commits)
  ├── ✅ ENV_SETUP_GUIDE.md                  (Sharing & security strategy)
  │
  ├── ✅ backend/
  │   ├── ✅ .env.example                    (Template with placeholders)
  │   ├── package.json                      (📋 TODO: Create)
  │   ├── src/
  │   │   ├── server.js                     (📋 TODO: Express setup)
  │   │   ├── models/
  │   │   │   ├── User.js                   (📋 TODO: Schema)
  │   │   │   ├── Session.js                (📋 TODO: Schema)
  │   │   │   └── Payment.js                (📋 TODO: Schema)
  │   │   ├── routes/
  │   │   │   ├── auth.js                   (📋 TODO: Auth endpoints)
  │   │   │   ├── sessions.js               (📋 TODO: Session endpoints)
  │   │   │   └── payments.js               (📋 TODO: Payment endpoints)
  │   │   ├── services/
  │   │   │   ├── claudeService.js          (📋 TODO: AI dialogue)
  │   │   │   ├── paymentService.js         (📋 TODO: Razorpay)
  │   │   │   └── authService.js            (📋 TODO: JWT)
  │   │   └── middleware/
  │   │       └── auth.js                   (📋 TODO: JWT verification)
  │   └── README.md                         (📋 TODO: Backend docs)
  │
  ├── ✅ frontend/
  │   ├── ✅ .env.example                    (Template)
  │   ├── package.json                      (📋 TODO: Create)
  │   ├── vite.config.js                    (📋 TODO: Vite config)
  │   ├── tailwind.config.js                (📋 TODO: Tailwind setup)
  │   ├── src/
  │   │   ├── pages/
  │   │   │   ├── Home.jsx                  (📋 TODO: Landing)
  │   │   │   ├── Session.jsx               (📋 TODO: Conversation UI)
  │   │   │   ├── Dashboard.jsx             (📋 TODO: Stats & charts)
  │   │   │   └── PaymentSuccess.jsx        (📋 TODO: Success page)
  │   │   ├── components/
  │   │   │   ├── SessionForm.jsx           (📋 TODO: Fear entry)
  │   │   │   ├── ConversationThread.jsx    (📋 TODO: Message display)
  │   │   │   ├── ProgressChart.jsx         (📋 TODO: Fear intensity chart)
  │   │   │   ├── PaymentModal.jsx          (📋 TODO: Razorpay modal)
  │   │   │   └── Layout.jsx                (📋 TODO: Nav + layout)
  │   │   ├── hooks/
  │   │   │   ├── useSession.js             (📋 TODO: Session API calls)
  │   │   │   └── usePayment.js             (📋 TODO: Payment logic)
  │   │   ├── utils/
  │   │   │   └── api.js                    (📋 TODO: Axios wrapper)
  │   │   ├── App.jsx                       (📋 TODO: Routing)
  │   │   └── main.jsx                      (📋 TODO: Entry point)
  │   └── README.md                         (📋 TODO: Frontend docs)
  │
  ├── ✅ docs/
  │   ├── ✅ API_SPEC.md                     (All endpoints documented)
  │   ├── ✅ DATA_MODEL.md                   (MongoDB schemas)
  │   └── DEPLOYMENT.md                     (📋 TODO: Production guide)
  │
  └── .github/
      └── workflows/
          └── deploy.yml                     (📋 TODO: CI/CD pipeline)
```

**✅ = Created**  
**📋 TODO = Next steps**

---

## 🛠️ Tech Stack Finalized

| Component | Technology | Free Tier | Notes |
|-----------|-----------|-----------|-------|
| **Backend** | Node.js 18+ | ✅ | Express.js for REST API |
| **Frontend** | React 18+ | ✅ | Vite (faster than CRA) |
| **Database** | MongoDB | ✅ | 512MB free tier (sufficient for MVP) |
| **AI** | Claude Sonnet | ✅ | $5/month free tier |
| **Payments** | Razorpay | ✅ | Unlimited test transactions |
| **Auth** | JWT | ✅ | Node crypto, bcrypt |
| **Styling** | Tailwind CSS | ✅ | shadcn/ui components |
| **Charts** | Recharts | ✅ | Simple line graphs |
| **Deploy Backend** | Railway.app | ✅ | 500 hrs/month free |
| **Deploy Frontend** | Vercel | ✅ | Unlimited deployments |

---

## 📋 14-Day Sprint Breakdown

### Week 1: Foundation & Core (Days 1-7)

| Day | Phase | Tasks | Deliverable |
|-----|-------|-------|-------------|
| **1** | Setup | Project scaffold, .env setup, DB schema | Runnable dev environment |
| **2** | Backend - Auth | User registration, login, JWT tokens | `/auth/register` `/auth/login` working |
| **3** | Backend - Sessions | Session CRUD, MongoDB integration | `/sessions` endpoints functional |
| **4** | Backend - Claude | Anthropic API integration, dialogue flow | AI responding to fear descriptions |
| **5** | Frontend - Setup | React + Vite + Tailwind, router, API client | Home page + navigation working |
| **6** | Frontend - Fear Entry | SessionForm component, input validation | User can describe fear + submit |
| **7** | Frontend - Conversation | Message display, real-time Claude responses | 5-turn conversation working |

### Week 2: Payments & Polish (Days 8-14)

| Day | Phase | Tasks | Deliverable |
|-----|-------|-------|-------------|
| **8** | Backend - Payments | Razorpay order creation, payment verification | `/payments/create-order` `/payments/verify` |
| **9** | Frontend - Payments | Payment modal, success handling, unlock flow | User can pay and unlock sessions |
| **10** | Frontend - Dashboard | Stats display, fear intensity chart, session list | Dashboard shows metrics |
| **11** | Testing | E2E flow: register → fear → pay → unlock | Full user journey works |
| **12** | Mobile Responsive | Test on mobile sizes, Tailwind tweaks | Mobile-first design validated |
| **13** | Polish & Bugs | Error handling, loading states, edge cases | Clean, production-ready UI |
| **14** | Deployment | Railway backend + Vercel frontend + final tests | Live URL ready for submission |

---

## 🚀 Day 1 Action Items (Today)

### Backend Setup
```bash
cd C:\Users\Public\Extern\BeyondFear-Scaler\backend

# Create package.json
npm init -y

# Install dependencies
npm install express cors dotenv mongoose bcryptjs jsonwebtoken axios

# Install dev dependencies
npm install --save-dev nodemon

# Create .env.local
cp .env.example .env.local
# Edit with your API keys

# Create folder structure (already done)
mkdir -p src/models src/routes src/services src/middleware utils

# Start development
npm run dev  # (after package.json scripts are added)
```

### Frontend Setup
```bash
cd C:\Users\Public\Extern\BeyondFear-Scaler\frontend

# Create React + Vite app
npm create vite@latest . -- --template react

# Install dependencies
npm install react-router-dom axios tailwindcss postcss autoprefixer recharts

# Install shadcn/ui
npm install -D @shadcn/ui

# Install Razorpay
npm install razorpay

# Create .env.local
cp .env.example .env.local

# Start dev server
npm run dev
```

### Database Setup
- MongoDB Atlas → Create cluster → Get connection string
- Place in `backend/.env.local`
- Don't commit the actual connection string

---

## 🔒 Environment Variables (Reference)

### Backend `.env.local` (NEVER COMMIT)
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/beyondfear-dev
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxxxxxxxxxxxxx
JWT_SECRET=your-32-char-random-secret
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env.local` (SAFE: public test keys)
```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
VITE_PAYMENT_PROVIDER=razorpay
```

---

## 📊 Success Metrics (Day 14)

### Must-Have (MVP)
- [ ] User can register + login
- [ ] User can create fear session
- [ ] Claude generates 5+ turn dialogues
- [ ] Session transcripts persist in MongoDB
- [ ] User can complete session + generate action items
- [ ] Dashboard shows correct metrics
- [ ] Payment wall activates at session 4
- [ ] Razorpay payment flow works end-to-end
- [ ] Post-payment: unlimited sessions unlocked
- [ ] Mobile responsive: tested on mobile browser
- [ ] Page load < 2s, Claude response < 5s
- [ ] Zero critical bugs

### Testing Checklist
- [ ] Test registration with duplicate email (error handling)
- [ ] Test payment with test card (success flow)
- [ ] Test mobile layout (iPhone 12, Pixel 5 sizes)
- [ ] Test with slow network (3G throttle)
- [ ] Test with wrong JWT token (unauthorized handling)
- [ ] Test with expired free sessions (payment required)

---

## 🎯 Sharing Strategy for Scaler

### For GitHub Submission
1. ✅ `.env.example` in repo (placeholders only)
2. ✅ Comprehensive README with setup steps
3. ❌ NEVER `.env` or `.env.local` (add to `.gitignore`)
4. ✅ Link to free API tier docs (Claude, MongoDB, Razorpay)
5. ✅ Working demo (deploy to Railway + Vercel)

### For Scaler Reviewers
**Option A:** Share live URL (Railway + Vercel)
```
Backend: https://beyondfear-api.railway.app/api
Frontend: https://beyondfear.vercel.app
```

**Option B:** Provide setup instructions in README (they run locally)
```bash
git clone <your-repo>
cp backend/.env.example backend/.env.local
# Fill in YOUR free API keys from console.anthropic.com, etc.
npm install && npm run dev
```

### For Payment Testing
Test card provided in README:
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- No real money charged (test mode)

---

## 🔄 Repeat Until Submission

1. **Daily Commits:** Every day, push to GitHub (shows iterative work)
2. **Feature Branches:** Use `git checkout -b feature/session-api` for each feature
3. **Merge to Main:** When feature complete
4. **README Updates:** Keep in sync with implementation
5. **Test Payments:** Verify payment flow after each backend change

---

## 📞 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` (backend) | Is MongoDB URI correct? Is server running on port 5000? |
| `Cannot find module` | Run `npm install` in that folder |
| `.env undefined` | Did you create `.env.local`? Restart server after editing. |
| Razorpay error | Using test keys (`rzp_test_`)? Check key ID & secret match |
| Claude 401 error | API key valid? Free tier active? Try new key from console. |
| CORS error | Frontend URL matches `FRONTEND_URL` in backend `.env`? |

---

## 📚 Resources

- **Anthropic Claude:** https://docs.anthropic.com
- **MongoDB:** https://docs.mongodb.com
- **Express.js:** https://expressjs.com
- **React:** https://react.dev
- **Razorpay:** https://razorpay.com/docs
- **Tailwind CSS:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com

---

## ✨ Next Steps

1. ✅ Read this checklist completely
2. ✅ Get API keys (MongoDB, Claude, Razorpay)
3. ✅ Create `.env.local` files in backend & frontend
4. ⏭️ **Day 1: Run `npm install` and verify environments work**
5. ⏭️ **Day 2-14: Follow sprint breakdown above**
6. ⏭️ **Day 15: Deploy to Railway + Vercel**
7. ⏭️ **Day 16: Final capstone report + submission**

---

**You're ready to start. Good luck! 🚀**

