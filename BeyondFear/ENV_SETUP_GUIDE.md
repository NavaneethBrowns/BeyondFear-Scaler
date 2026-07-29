# BeyondFear: Environment Setup Guide (MVP)

## Quick Start: Local Development

### Step 1: Set Up Environment Files

**Both backend and frontend have `.env.example` files in the repo.** Copy these and fill in your keys:

```bash
# Backend
cd backend
cp .env.example .env.local

# Frontend  
cd frontend
cp .env.example .env.local
```

**⚠️ IMPORTANT:** 
- `.env.local` files are **gitignored** (never committed)
- Only share `.env.local` via secure channels (password manager, encrypted message)
- Never commit actual API keys to git

---

## Step 2: Get Free API Keys

All services below offer free tiers suitable for MVP:

### MongoDB (Database)
- **URL:** https://www.mongodb.com/cloud/atlas
- **Setup:** Sign up → Create cluster → Get connection string
- **Free tier:** 512 MB storage (enough for MVP testing)
- **Add to `backend/.env.local`:** `MONGODB_URI=mongodb+srv://username:password@...`

### Claude API (AI)
- **URL:** https://console.anthropic.com/keys
- **Setup:** Create account → Generate API key
- **Free tier:** $5/month credit (sufficient for MVP)
- **Add to `backend/.env.local`:** `ANTHROPIC_API_KEY=sk-ant-...`

### Razorpay (Payments - Test Mode)
- **URL:** https://razorpay.com/sign-up
- **Setup:** Create account → Dashboard → Copy test keys (marked "TEST")
- **Free tier:** Unlimited test transactions (no real money)
- **Test card:** `4111 1111 1111 1111` (expires any future date)
- **Add to `backend/.env.local`:** `RAZORPAY_KEY_ID=...` & `RAZORPAY_KEY_SECRET=...`
- **Add to `frontend/.env.local`:** `VITE_RAZORPAY_KEY_ID=...`

### JWT Secret (Security)
```bash
# Generate random secret in terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to backend/.env.local: JWT_SECRET=<generated-value>
```

---

## Step 3: Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend  
npm install
npm run dev
```

Backend runs on `http://localhost:5000`  
Frontend runs on `http://localhost:5173`

---

## Sharing with Another Developer

### Recommended Approach (Industry Standard)

**DO:**
- ✅ Commit `.env.example` files to git (templates with placeholders)
- ✅ Share actual `.env.local` files via **password manager** or **encrypted channel**
- ✅ Document where to get each key (see Step 2 above)

**DON'T:**
- ❌ Commit `.env` or `.env.local` files 
- ❌ Email API keys in plaintext
- ❌ Put secrets in "locked folders" on git (git doesn't enforce permissions)
- ❌ Hardcode secrets in code

### For Scaler Project Reviewers (Recommended Approach)

### Option A: Env Template + Setup Instructions (BEST FOR MVP)

`.env.example` files already exist in repo:

**`.env.example`** (COMMIT THIS)
```env
# Copy this file to .env.local and fill in your keys

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/beyondfear-dev

# Claude AI - Get free key from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# Razorpay Test Keys (Safe sandbox for testing)
# Sign up: https://razorpay.com (free test account)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxxxxxxxxxxxxx

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=generate-your-own-32-char-secret
```

**In README.md:**
```markdown
## Quick Start - Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas free account (https://www.mongodb.com/cloud/atlas)
- Claude API key (free tier available: https://console.anthropic.com)
- Razorpay test account (free: https://razorpay.com/sign-up)

### Setup Steps

1. **Clone & Install**
   ```bash
   git clone https://github.com/NavaneethBrowns/BeyondFear-Scaler.git
   cd BeyondFear-Scaler
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Backend
   cd backend
   cp .env.example .env.local
   # Edit .env.local with YOUR keys
   
   # Frontend
   cd ../frontend
   cp .env.example .env.local
   ```

3. **Get Free API Keys**
   - **Claude:** https://console.anthropic.com/keys (free $5/month)
   - **MongoDB:** https://www.mongodb.com/cloud/atlas (free tier)
   - **Razorpay:** https://razorpay.com/sign-up (test mode, no real payment)

4. **Start Development**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

5. **Test Payment Flow**
   Use Razorpay test card: `4111 1111 1111 1111` (expires any future date)
```

---

### Option B: Demo Credentials (For Limited Reviewers - SECURE)

If Scaler requires a **working demo** on their machine:

1. **Create a separate "demo" GitHub branch** with demo credentials (for Scaler reviewer only)
2. **Narrow access:** Share link + password only with reviewer
3. **Rotate credentials after review** (invalidate the demo keys)

**Example Demo Branch Setup:**
```bash
git checkout -b demo/scaler-reviewer
# Commit .env with demo credentials
# Push to private branch
# Share link + access password with reviewer
```

---

### Option C: Deploy Working Demo (BEST USER EXPERIENCE)

Host a **live demo** so reviewers see it working without local setup:

**Free Deployment Options:**
- **Backend:** Railway.app (free tier, 500 hours/month)
- **Frontend:** Vercel (free tier)
- **Database:** MongoDB Atlas (free tier)

**Advantage:** Reviewers click link → see app working → no setup friction.

---

## For Payment Tracking (Razorpay Integration)

### Why Payment Tracking Matters
- **For you:** Know who paid, when, for what (revenue insight)
- **For Scaler requirement:** Demonstrates real payment integration (not just UI)
- **For users:** They know payment succeeded (confidence)

### Implementation Strategy

**Database Schema:**
```javascript
// models/Payment.js
const paymentSchema = new Schema({
  orderId: String,           // Razorpay order ID
  paymentId: String,         // Razorpay payment ID
  userId: String,            // User identifier (can be anonymous or email)
  amount: Number,            // Amount in paise (e.g., 19900 = INR 199)
  currency: String,          // "INR"
  status: String,            // "created" | "attempted" | "captured" | "failed"
  sessionUnlocked: Boolean,  // Did payment unlock sessions?
  metadata: {
    userEmail: String,
    planType: String,        // "monthly" | "3-months" | "annual"
    deviceInfo: String,
  },
  createdAt: Date,
  updatedAt: Date,
});
```

**API Endpoints:**
```
POST   /api/payments/create-order          → Create Razorpay order
POST   /api/payments/verify-signature      → Verify + unlock sessions
GET    /api/payments/history               → User's payment history
GET    /api/admin/payments/summary         → Revenue dashboard (for you)
```

**Webhook for Razorpay:**
```javascript
// Handle real-time payment updates
POST /api/payments/webhook
// Razorpay sends: payment.authorized, payment.failed, payment.pending
// Update session unlock status in real-time
```

---

## Mobile-First Responsive Design (No Separate App)

### Breakpoints
```css
/* Mobile-first approach */
/* Default: <480px (phones) */
/* Tablet: ≥768px */
/* Desktop: ≥1024px */
```

### Components Strategy
- **React Grid:** Use CSS Grid + Flexbox, not separate mobile components
- **TailwindCSS:** Built-in responsive helpers (`md:`, `lg:`, `xl:`)
- **shadcn/ui:** Already responsive by default

### Example: Session Form (Mobile-First)
```jsx
// Single component, responsive by design
export function SessionForm() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-8">
      {/* Mobile: full width, small padding */}
      {/* Tablet: wider container */}
      {/* Desktop: centered, max-width constrained */}
      
      <input
        className="w-full text-lg md:text-base lg:text-sm"
        placeholder="Describe your fear..."
      />
      <button className="w-full md:w-auto px-6 py-2">
        Start Dialogue
      </button>
    </div>
  );
}
```

---

## Recommended Approach for Scaler Submission

| Aspect | Recommendation |
|--------|-----------------|
| **Env Setup** | `.env.example` + comprehensive README |
| **Payment** | Full Razorpay integration + test flow documented |
| **Demo** | Option C (live deploy) or Option A (setup guide) |
| **Mobile Design** | Mobile-first Tailwind, responsive by default |
| **Credentials** | NEVER commit real keys; use free tier for all services |

---

## Quick Reference: Free API Tier Quotas

| Service | Free Tier | Sufficient? |
|---------|-----------|------------|
| **Claude API** | $5/month free | ✅ Yes (~10k tokens) |
| **MongoDB Atlas** | 512MB free | ✅ Yes (MVP data) |
| **Razorpay Test** | Unlimited test txns | ✅ Yes (no real charges) |
| **Railway Deploy** | 500 hrs/month | ✅ Yes (always-on okay) |
| **Vercel Deploy** | Unlimited deploys | ✅ Yes |

---

## Action Items Before Submission

- [ ] Create `.env.example` in backend & frontend
- [ ] Add setup guide to README.md
- [ ] Implement Razorpay payment tracking
- [ ] Test mobile responsiveness (DevTools: iPhone 12, Pixel 5)
- [ ] Deploy to Railway + Vercel (get live URL)
- [ ] Create demo credentials branch (if needed)
- [ ] Document payment webhook flow
- [ ] Verify all free tier services work without paying

---

**Next Steps:** Ready to implement env config, payment tracking, and responsive design in the actual codebase?
