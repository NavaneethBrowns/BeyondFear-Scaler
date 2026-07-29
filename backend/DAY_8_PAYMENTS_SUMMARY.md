# Day 8: Backend Payments Hardening - Implementation Summary

## Completed Tasks ✅

### 1. Payment Transaction Model (`src/models/Payment.js`)
**Purpose:** Track individual payment transactions for auditing and subscription management

**Key Fields:**
- `userId` - User who made payment
- `orderId` - Razorpay order ID (unique)
- `paymentId` - Razorpay payment ID (unique, sparse)
- `amount` - Amount in paise (100 = ₹1)
- `currency` - Payment currency (INR/USD)
- `planType` - Plan purchased (monthly/quarterly/annual)
- `status` - Payment status (created/attempted/captured/failed/refunded)
- `signature` - HMAC signature for verification
- `sessionUnlocked` - Whether payment unlocked sessions
- `metadata` - User agent, IP, failure reason, retry count
- `expiresAt` - When payment record expires (TTL index: 15 min for 'created' orders)

**Indexes:**
- Compound index on `(userId, createdAt)` for recent payments
- Compound index on `(userId, status)` for successful payments lookup
- TTL index auto-deletes uncaptured orders after 15 minutes

**Helper Methods:**
- `isValid()` - Check if payment is still valid (captured + not expired)
- `findActivePaymentsByUser(userId)` - Get all active/valid payments
- `findLatestSuccessfulPayment(userId)` - Get most recent successful payment

---

### 2. Pricing & Subscription Constants (`src/config/pricing.js`)
**Purpose:** Centralized pricing tiers, session limits, and subscription logic

**Pricing Tiers:**
```javascript
{
  monthly:  { amount: 19900,  durationDays: 30,  name: 'Monthly Plan' },
  quarterly:{ amount: 49900,  durationDays: 90,  name: 'Quarterly Plan (17% off)' },
  annual:   { amount: 79900,  durationDays: 365, name: 'Annual Plan (67% off)' }
}
```

**Free Tier:**
- 1 session per month
- Resets every 30 days automatically

**Key Utilities:**
- `getPricingTier(planType)` - Get tier details
- `isValidPlanType(planType)` - Validate plan
- `calculateExpiryDate(planType, startDate)` - Calculate expiry
- `isSubscriptionExpired(expiresAt)` - Check expiry
- `getCurrentSubscriptionStatus(subscription)` - Get status (free/premium/expired)
- `getSessionsRemaining(user)` - Get session count and limits
- `canCreateSession(user)` - Check if user can create session with reason
- `shouldResetFreeSessions(lastResetDate)` - Check if reset needed

---

### 3. Enhanced Payment Service (`src/services/payment.service.js`)
**Improvements:**
- ✅ Plan type validation in order creation
- ✅ Amount verification against pricing tiers
- ✅ Payment record creation and persistence
- ✅ `recordPaymentCapture()` - Save successful payment
- ✅ `getSubscriptionFromLastPayment()` - Retrieve subscription from latest payment
- ✅ `recordPaymentFailure()` - Log payment failures with reasons

**New Functions:**
```javascript
// Create order with validation
createPaymentOrder({ amount, currency, receipt, planType, userId })

// Get subscription from last successful payment
getSubscriptionFromLastPayment(userId)

// Record payment capture
recordPaymentCapture(orderId, paymentId, signature)

// Log payment failure
recordPaymentFailure(orderId, reason)
```

---

### 4. Hardened Payment Routes (`src/routes/payment.routes.js`)
**Improvements:**
- ✅ Plan type validation before order creation
- ✅ Better error messages for edge cases
- ✅ Signature verification with proper error handling
- ✅ Plan type tracking in response
- ✅ Session limit info in status endpoint

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/create-order` | POST | Create order with plan validation |
| `/api/payments/verify` | POST | Verify signature & activate subscription |
| `/api/payments/verify-payment` | POST | Alias for verify (same handler) |
| `/api/payments/status` | GET | Get subscription & session limits |
| `/api/payments/plans` | GET | Get all available pricing plans |
| `/api/payments/record-failure` | POST | Record payment failure |

**Request/Response Examples:**

```javascript
// POST /api/payments/create-order
Request:  { planType: 'monthly' }
Response: {
  success: true,
  order: { order_id, amount, currency, planType },
  planDetails: { name, description, amount, durationDays }
}

// POST /api/payments/verify
Request:  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
Response: {
  success: true,
  message: 'Payment verified and subscription activated',
  subscription: { status, planType, expiresAt }
}

// GET /api/payments/status
Response: {
  success: true,
  subscription: { status, planType, expiresAt },
  sessions: { used, total, remaining, isUnlimited },
  canCreateSession: boolean,
  limitMessage: string or null
}

// GET /api/payments/plans
Response: {
  success: true,
  plans: [
    { planType, name, description, amount, durationDays, displayAmount },
    ...
  ]
}
```

---

### 5. Session Limit Enforcement (`src/routes/session.routes.js`)
**Changes to POST /api/sessions:**
- ✅ Import pricing constants
- ✅ Use `canCreateSession(user)` to check limits
- ✅ Return 402 (Payment Required) if limit exceeded
- ✅ Include session remaining count in response
- ✅ Better error messages with actionable CTA

**Logic Flow:**
1. User tries to create session
2. Check `canCreateSession(user)` 
   - If premium & not expired → Allow
   - If expired → Return "Subscription expired. Please renew."
   - If free with sessions left → Allow
   - If free and out of sessions → Return 402 "Upgrade to premium"
3. Create session
4. If free tier → Increment session counter

**Response Examples:**

```javascript
// Success (premium user)
{
  success: true,
  session: { id, title, description, ... },
  sessionsRemaining: { used: 0, total: -1, remaining: -1, isUnlimited: true }
}

// Limit exceeded
{
  success: false,
  error: 'Free tier limit reached. Used 1/1 sessions. Upgrade to premium...',
  sessionLimit: { used: 1, total: 1, remaining: 0, isUnlimited: false }
}
// HTTP 402 Payment Required
```

---

### 6. Subscription Management Utilities (`src/utils/subscription.js`)
**Purpose:** Handle subscription renewal, reset logic, and expiry checks

**Key Functions:**
- `resetFreeSessions(subscription)` - Reset monthly sessions
- `isSubscriptionExpired(subscription)` - Check expiry status
- `handleExpiredSubscription(subscription)` - Downgrade expired premium to free
- `applySubscriptionMaintenance(user)` - Apply all maintenance logic
- `formatSubscriptionResponse(subscription)` - Format for API response
- `getSubscriptionStatusMessage(user)` - Human-readable status

**Auto-Maintenance Logic:**
Every time user object is loaded, automatically:
1. Check if premium subscription expired → downgrade to free
2. Check if free session reset needed (>30 days) → reset counter
3. Update subscription object in-place

This ensures subscriptions stay current without cron jobs.

---

### 7. Enhanced Auth Service (`src/services/auth.store.js`)
**Improvements:**
- ✅ `getUserById()` now applies subscription maintenance automatically
- ✅ `updateUserSubscription()` supports all new fields:
  - `expiresAt` - Subscription expiry date
  - `freeSessions.used / .total` - Session counters
  - `freeSessionsLastResetDate` - Last reset timestamp
  - `planType` - Specific plan (monthly/quarterly/annual)
- ✅ Full backward compatibility with legacy field names
- ✅ Automatic maintenance applied on save

**Example Usage:**
```javascript
// Update to premium
updateUserSubscription(userId, {
  status: 'premium',
  planType: 'monthly',
  expiresAt: new Date(Date.now() + 30*24*60*60*1000),
  lastPaymentDate: new Date()
})

// Automatic maintenance applied
const user = await getUserById(userId)
// → Subscription checked for expiry
// → Free sessions checked for reset
// → User object auto-updated
```

---

## Payment Flow (End-to-End)

### User Flow:
1. **Discover Limit** → User hits session limit on free tier
2. **Open Pricing Modal** → See plans (monthly/quarterly/annual)
3. **Select Plan** → Click "Monthly Plan - ₹199"
4. **Create Order** → Frontend calls `POST /api/payments/create-order` with `{ planType: 'monthly' }`
5. **Razorpay Modal** → Razorpay SDK opens checkout modal
6. **User Pays** → Enter card details (test: 4111 1111 1111 1111)
7. **Verify Signature** → Frontend calls `POST /api/payments/verify` with signature
8. **Subscription Activated** → Backend updates user to `status: 'premium'`
9. **Create Session** → User can now create unlimited sessions
10. **Unlock Features** → User sees "Premium - 30 days remaining"

---

## Security Improvements ✅

1. **HMAC Signature Verification** - Razorpay payments verified server-side
2. **Amount Validation** - Cannot spoof higher/lower amounts
3. **Plan Type Validation** - Cannot create orders for non-existent plans
4. **User Authorization** - Payments linked to authenticated user
5. **Payment Record Persistence** - All transactions logged for audit
6. **Automatic Cleanup** - Uncaptured orders auto-deleted after 15 minutes
7. **Failure Tracking** - Payment failures logged with reasons
8. **Subscription Expiry Enforcement** - Expired subscriptions auto-downgraded

---

## Database Schema Updates

### User.subscription object:
```javascript
{
  status: 'free' | 'premium',              // Current status
  planType: 'free' | 'monthly' | 'quarterly' | 'annual' | 'lifetime',
  freeSessions: {
    used: Number,                          // Sessions used this month
    total: Number                          // Sessions allowed (1 for free)
  },
  expiresAt: Date | null,                  // When premium expires
  lastPaymentDate: Date | null,            // Last successful payment
  nextResetDate: Date | null,              // When free sessions reset
  freeSessionsLastResetDate: Date | null   // Last free session reset
}
```

### Payment collection:
```javascript
{
  userId: ObjectId,
  orderId: String (unique),
  paymentId: String (unique, sparse),
  amount: Number,
  currency: String,
  planType: String,
  status: String (created/attempted/captured/failed/refunded),
  signature: String,
  sessionUnlocked: Boolean,
  metadata: {
    userEmail: String,
    userAgent: String,
    ipAddress: String,
    failureReason: String,
    retryCount: Number
  },
  expiresAt: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

---

## Testing Checklist ✅

### 1. Order Creation
- [x] Valid plan → Creates order with correct amount
- [x] Invalid plan → Returns 400 error
- [x] Amount mismatch → Returns 400 error

### 2. Payment Verification
- [x] Valid signature → Activates subscription
- [x] Invalid signature → Returns 400, records failure
- [x] Missing fields → Returns 400 error
- [x] Subscription updated → User has premium status + expiry date

### 3. Session Creation
- [x] Premium user → Can create unlimited sessions
- [x] Free user (0/1 used) → Can create 1 session
- [x] Free user (1/1 used) → Returns 402 error
- [x] Expired premium → Downgraded to free, follows free tier limits

### 4. Status Endpoint
- [x] Returns correct subscription status
- [x] Shows session remaining count
- [x] Indicates if user can create session

### 5. Pricing Plans
- [x] GET /api/payments/plans returns all 3 tiers
- [x] Each plan has correct amount and duration

---

## Next Steps (Day 9)

- [ ] Frontend payment form component
- [ ] Razorpay SDK integration in Chat page
- [ ] Payment success/failure handling
- [ ] Unlock animation/messaging when premium activated
- [ ] Session limit badge on Chat sidebar
- [ ] Upgrade prompt in session creation error

---

## Troubleshooting

### "Razorpay credentials are not configured"
→ Check `.env.local` has `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### Payment captured but subscription not updated
→ Check Payment model was saved before subscription update
→ Verify `recordPaymentCapture()` ran successfully

### Session limit not enforced
→ Check `canCreateSession(user)` is called before session creation
→ Verify user.subscription object exists

### Free sessions not resetting
→ Check `freeSessionsLastResetDate` is being set
→ Verify `shouldResetFreeSessions()` logic (>30 days)

---

## Files Modified

```
backend/src/
├── config/
│   └── pricing.js (NEW)
├── models/
│   ├── Payment.js (NEW)
│   └── User.js (no changes needed - already has subscription field)
├── services/
│   ├── payment.service.js (ENHANCED)
│   └── auth.store.js (ENHANCED)
├── routes/
│   ├── payment.routes.js (HARDENED)
│   └── session.routes.js (ENHANCED)
└── utils/
    └── subscription.js (NEW)
```

---

## Production Readiness Checklist

- [x] HMAC signature verification
- [x] Payment record persistence
- [x] Subscription expiry enforcement
- [x] Free session reset logic
- [x] Error handling and logging
- [x] Amount validation
- [x] User authorization checks
- [ ] Rate limiting on payment endpoints (optional - covered by global rate limiter)
- [ ] Webhook handling for async payment updates (future enhancement)
- [ ] Refund handling (future enhancement)
- [ ] Dispute resolution logs (future enhancement)

---

## Summary

Day 8 delivers a **production-hardened backend payment system** with:
- ✅ Razorpay integration with signature verification
- ✅ Payment tracking and audit logs
- ✅ Flexible pricing tiers (3 plans)
- ✅ Automatic subscription expiry enforcement
- ✅ Session limit enforcement at route level
- ✅ Free tier monthly reset logic
- ✅ Comprehensive error handling
- ✅ User-friendly error messages with actionable CTAs

The system is **ready for frontend integration** in Day 9.
