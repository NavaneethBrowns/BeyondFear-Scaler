# Day 9: Frontend Payments Integration Guide

## Overview
Day 8 backend is complete with Razorpay integration, payment tracking, and subscription enforcement. Day 9 needs to build the frontend UI and integrate Razorpay SDK.

---

## Backend Endpoints Ready ✅

### 1. Create Payment Order
```
POST /api/payments/create-order
Auth: Required (JWT token)

Request:
{
  "planType": "monthly" | "quarterly" | "annual"
}

Response:
{
  "success": true,
  "order": {
    "order_id": "order_xxx",
    "amount": 19900,
    "currency": "INR",
    "planType": "monthly"
  },
  "planDetails": {
    "name": "Monthly Plan",
    "description": "Unlimited sessions for 30 days",
    "amount": 19900,
    "durationDays": 30
  }
}
```

### 2. Verify Payment
```
POST /api/payments/verify
Auth: Required (JWT token)

Request:
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "xxx"
}

Response:
{
  "success": true,
  "message": "Payment verified and subscription activated",
  "subscription": {
    "status": "premium",
    "planType": "monthly",
    "expiresAt": "2026-08-28T12:34:56.000Z"
  }
}
```

### 3. Get Subscription Status
```
GET /api/payments/status
Auth: Required (JWT token)

Response:
{
  "success": true,
  "subscription": {
    "status": "premium",
    "planType": "monthly",
    "expiresAt": "2026-08-28T12:34:56.000Z"
  },
  "sessions": {
    "used": 0,
    "total": -1,
    "remaining": -1,
    "isUnlimited": true
  },
  "canCreateSession": true,
  "limitMessage": null
}
```

### 4. Get All Plans
```
GET /api/payments/plans
Auth: Not required

Response:
{
  "success": true,
  "plans": [
    {
      "planType": "monthly",
      "name": "Monthly Plan",
      "description": "Unlimited sessions for 30 days",
      "amount": 19900,
      "displayAmount": "₹199",
      "durationDays": 30
    },
    {
      "planType": "quarterly",
      "name": "Quarterly Plan",
      "description": "Unlimited sessions for 90 days (Best Value)",
      "amount": 49900,
      "displayAmount": "₹499",
      "durationDays": 90,
      "discount": "17%"
    },
    {
      "planType": "annual",
      "name": "Annual Plan",
      "description": "Unlimited sessions for 365 days",
      "amount": 79900,
      "displayAmount": "₹799",
      "durationDays": 365,
      "discount": "67%"
    }
  ]
}
```

### 5. Record Payment Failure
```
POST /api/payments/record-failure
Auth: Required (JWT token)

Request:
{
  "orderId": "order_xxx",
  "reason": "User cancelled payment" (optional)
}

Response:
{
  "success": true,
  "message": "Payment failure recorded"
}
```

---

## Error Handling

### Session Limit Exceeded
When creating a session hits the free tier limit:
```
Status: 402 Payment Required

Response:
{
  "success": false,
  "error": "Free tier limit reached. Used 1/1 sessions. Upgrade to premium for unlimited access.",
  "sessionLimit": {
    "used": 1,
    "total": 1,
    "remaining": 0,
    "isUnlimited": false
  }
}
```

### Subscription Expired
```
Status: 402 Payment Required

Response:
{
  "success": false,
  "error": "Subscription expired. Please renew to continue.",
  "sessionLimit": {...}
}
```

---

## Frontend Components Needed for Day 9

### 1. PaymentModal Component
**Where:** Show when user tries to create session but hits limit

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onSuccess: (subscription) => void,
  onError: (error) => void
}
```

**Features:**
- Display 3 pricing plans with icons
- Show discount badges (17% off quarterly, 67% off annual)
- Select plan button for each
- Loading state while creating order
- Razorpay SDK integration

### 2. SubscriptionBadge Component
**Where:** Sidebar or navbar to show subscription status

**Props:**
```javascript
{
  subscription: {
    status: 'free' | 'premium',
    planType: string,
    expiresAt: Date,
    daysRemaining?: number
  }
}
```

**Display:**
- "Free - 1/1 sessions" (for free tier)
- "Premium - 27 days remaining" (for premium)
- "Subscription Expired" (for expired)

### 3. SessionLimitDialog Component
**Where:** Show when POST /api/sessions returns 402

**Props:**
```javascript
{
  error: string,
  sessionLimit: {
    used: number,
    total: number,
    remaining: number,
    isUnlimited: boolean
  },
  onUpgrade: () => void,  // Opens PaymentModal
  onClose: () => void
}
```

**Display:**
- Show usage: "You've used 1 of 1 sessions"
- Show message: "Upgrade to premium for unlimited access"
- "Upgrade Now" button → opens PaymentModal

### 4. Update ChatPage
**Changes needed:**
- Import PaymentModal, SubscriptionBadge
- Show subscription status in sidebar header
- Catch 402 errors when creating session → show SessionLimitDialog
- On payment success → retry session creation

---

## Integration Steps (Day 9 Checklist)

### Step 1: Create PaymentModal Component
- [ ] Create `frontend/src/components/PaymentModal.jsx`
- [ ] Fetch plans from `GET /api/payments/plans`
- [ ] Display 3 plan cards with pricing
- [ ] Integrate Razorpay SDK
  ```javascript
  // In component
  import Razorpay from 'razorpay';
  // On plan select:
  const order = await api.post('/payments/create-order', { planType });
  Razorpay.open(order); // Opens SDK
  ```
- [ ] Handle success: Call `POST /api/payments/verify`
- [ ] Handle failure: Call `POST /api/payments/record-failure`
- [ ] Show loading states during payment

### Step 2: Create SubscriptionBadge Component
- [ ] Create `frontend/src/components/SubscriptionBadge.jsx`
- [ ] Display status based on subscription object
- [ ] Show "Upgrade" button if expired or free

### Step 3: Create SessionLimitDialog Component
- [ ] Create `frontend/src/components/SessionLimitDialog.jsx`
- [ ] Show error message from 402 response
- [ ] Show session usage stats
- [ ] "Upgrade Now" button opens PaymentModal

### Step 4: Update ChatPage
- [ ] Add state for:
  - `paymentModalOpen`
  - `sessionLimitError`
  - `subscription`
- [ ] Show SubscriptionBadge in sidebar header
- [ ] Wrap session creation in try-catch
  - [ ] On 402 error → set sessionLimitError state
  - [ ] Show SessionLimitDialog
  - [ ] On payment success → clear error + retry
- [ ] On mount: Fetch `GET /api/payments/status` to get subscription

### Step 5: Update API Service
- [ ] Add payment API methods in `frontend/src/services/api.js`:
  ```javascript
  paymentAPI: {
    getPlans: () => get('/payments/plans'),
    createOrder: (planType) => post('/payments/create-order', { planType }),
    verifyPayment: (orderId, paymentId, signature) => 
      post('/payments/verify', { razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    getStatus: () => get('/payments/status'),
    recordFailure: (orderId, reason) => post('/payments/record-failure', { orderId, reason })
  }
  ```

### Step 6: Handle Success/Failure Flows
- [ ] On payment success:
  - Show "Payment successful! 🎉"
  - Update subscription state
  - Retry session creation
  - Close PaymentModal
  - Show unlock animation
- [ ] On payment failure:
  - Show error message
  - "Retry" button
  - "Cancel" button

### Step 7: Testing
- [ ] Free tier user tries 2nd session → Gets 402 error
- [ ] Click "Upgrade" → PaymentModal opens
- [ ] Select plan → Creates order
- [ ] Use test card: 4111 1111 1111 1111 (any expiry)
- [ ] Verify signature succeeds → Subscription updated
- [ ] Can now create unlimited sessions
- [ ] SubscriptionBadge shows "Premium - 30 days"
- [ ] After 30 days (simulated): Auto-downgrade to free

---

## Frontend API Service Example

```javascript
// frontend/src/services/api.js - Add these methods

const paymentAPI = {
  /**
   * Get all available pricing plans
   */
  getPlans: async () => {
    try {
      const { data } = await api.get('/payments/plans');
      return data.plans;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Create payment order
   */
  createOrder: async (planType) => {
    try {
      const { data } = await api.post('/payments/create-order', { planType });
      return data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Verify payment signature
   */
  verifyPayment: async (orderId, paymentId, signature) => {
    try {
      const { data } = await api.post('/payments/verify', {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
      return data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get subscription status
   */
  getStatus: async () => {
    try {
      const { data } = await api.get('/payments/status');
      return data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Record payment failure
   */
  recordFailure: async (orderId, reason) => {
    try {
      const { data } = await api.post('/payments/record-failure', {
        orderId,
        reason,
      });
      return data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export { paymentAPI };
```

---

## Razorpay SDK Integration Example

```javascript
// In PaymentModal.jsx
import Razorpay from 'razorpay';

const handlePlanSelect = async (planType) => {
  setLoading(true);
  try {
    // Step 1: Create order on backend
    const orderResponse = await paymentAPI.createOrder(planType);
    const { order_id, amount } = orderResponse.order;

    // Step 2: Open Razorpay SDK
    const razorpayOptions = {
      key: process.env.VITE_RAZORPAY_KEY_ID,
      amount: amount,
      currency: 'INR',
      order_id: order_id,
      name: 'BeyondFear',
      description: `${planType} plan`,
      handler: async (response) => {
        // Step 3: Verify signature on backend
        await handlePaymentSuccess(
          order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
      },
      prefill: {
        email: userEmail,
      },
      theme: {
        color: '#ff641f', // Flame orange
      },
    };

    const razorpay = new Razorpay(razorpayOptions);
    razorpay.open();
  } catch (error) {
    setError(error.message || 'Failed to create payment order');
  } finally {
    setLoading(false);
  }
};

const handlePaymentSuccess = async (orderId, paymentId, signature) => {
  try {
    const result = await paymentAPI.verifyPayment(orderId, paymentId, signature);
    
    if (result.success) {
      // Update subscription and close modal
      onSuccess(result.subscription);
      setLoading(false);
    }
  } catch (error) {
    setError('Payment verification failed. Please contact support.');
    // Record failure
    await paymentAPI.recordFailure(orderId, error.message);
  }
};
```

---

## Testing with Razorpay Test Mode

**Test Card:** 4111 1111 1111 1111  
**Expiry:** Any future date (e.g., 12/25)  
**CVV:** Any 3 digits (e.g., 123)  
**Name:** Any text  

**Result:** Payment succeeds in test mode (no real charge)

---

## Troubleshooting

### "Razorpay SDK not loading"
→ Check `.env.local` has `VITE_RAZORPAY_KEY_ID`
→ Check Razorpay script is imported

### "Signature verification failed"
→ Ensure backend received exact order_id, payment_id, signature
→ Check Razorpay credentials in backend `.env.local`

### "Session creation still returns 402 after payment"
→ Check subscription updated: GET /api/payments/status
→ Check user subscription.status === 'premium'
→ Check expiresAt is in future

---

## Next: Day 10 Planning

Once Day 9 payments are working:
- Dashboard with session history and stats
- Session progress view (fear intensity graph)
- Settings page (change plan, cancel subscription)
- Email receipts on payment success
- Automated renewal reminders (3 days before expiry)

---

## Summary

Day 9 focuses on bringing the payment flow to life:
1. ✅ Backend complete (Day 8)
2. → Frontend UI components (Day 9)
3. → Razorpay SDK integration (Day 9)
4. → Error handling and edge cases (Day 9)
5. → Testing with real test card (Day 9)

Once Day 9 is complete, users can:
- Hit free session limit
- Click "Upgrade"
- Pay with test card
- Get unlimited sessions immediately
- See subscription status
- Auto-downgrade when expired
