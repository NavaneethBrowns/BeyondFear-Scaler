# BeyondFear: API Specification

**Base URL:** `http://localhost:5000/api` (dev) | `https://api.beyondfear.com/api` (production)

---

## 🔐 Authentication

All endpoints (except `/auth/register`, `/auth/login`) require:

```bash
Authorization: Bearer <jwt_token>
```

JWT Token lifetime: **7 days**

---

## 👤 Authentication Endpoints

### POST `/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "priya@example.com",
  "password": "SecurePass123!",
  "displayName": "Priya S."
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "priya@example.com",
    "displayName": "Priya S.",
    "subscription": {
      "status": "free",
      "freeSessions": { "used": 0, "total": 3 }
    }
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid email/password format
- `409 Conflict` - Email already registered

---

### POST `/auth/login`

Authenticate and get JWT token.

**Request:**
```json
{
  "email": "priya@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "priya@example.com",
    "subscription": {
      "status": "free",
      "sessionsRemaining": 3
    }
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - User doesn't exist

---

### GET `/auth/me`

Get current user profile.

**Request:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "priya@example.com",
    "displayName": "Priya S.",
    "subscription": {
      "status": "free",
      "freeSessions": { "used": 1, "total": 3 },
      "sessionsRemaining": 2
    },
    "lastLoginAt": "2026-07-18T14:22:00Z"
  }
}
```

---

## 📝 Session Endpoints (Fears & Dialogues)

### POST `/sessions`

Create a new fear journaling session.

**Request:**
```json
{
  "fearTitle": "Impostor Syndrome",
  "fearDescription": "I feel like I don't belong in my engineering team...",
  "fearCategory": "career"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Session started",
  "session": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "fearTitle": "Impostor Syndrome",
    "fearDescription": "I feel like I don't belong...",
    "fearCategory": "career",
    "fearIntensity": { "initialScore": 8 },
    "status": "active",
    "conversationHistory": [],
    "createdAt": "2026-07-18T10:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Missing required fields
- `402 Payment Required` - Free sessions exhausted
- `401 Unauthorized` - Not authenticated

---

### GET `/sessions`

List all user's sessions.

**Query Parameters:**
- `status` (optional): `"active"` | `"completed"` | `"archived"`
- `limit` (optional): Default 10, Max 50
- `offset` (optional): Default 0

**Response:** `200 OK`
```json
{
  "success": true,
  "sessions": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "fearTitle": "Impostor Syndrome",
      "fearCategory": "career",
      "fearIntensity": { "initialScore": 8, "finalScore": 6 },
      "status": "completed",
      "createdAt": "2026-07-18T10:30:00Z"
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

---

### GET `/sessions/:id`

Get session details with full conversation.

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "_id": "507f1f77bcf86cd799439012",
    "fearTitle": "Impostor Syndrome",
    "fearDescription": "I feel like I don't belong in my engineering team...",
    "fearCategory": "career",
    "fearIntensity": {
      "initialScore": 8,
      "finalScore": 6,
      "trend": "decreased"
    },
    "conversationHistory": [
      {
        "role": "user",
        "content": "I feel like a fraud at work. Everyone seems smarter.",
        "timestamp": "2026-07-18T10:30:00Z"
      },
      {
        "role": "assistant",
        "content": "Let's explore this together. What makes you feel this way?",
        "timestamp": "2026-07-18T10:31:00Z"
      }
    ],
    "actionItems": [
      {
        "title": "Speak up in next standup",
        "description": "Share one technical idea, even if rough",
        "dueDate": "2026-07-25",
        "completed": false,
        "priority": "high"
      }
    ],
    "keyInsights": [
      "Perfectionism is preventing you from sharing ideas",
      "Your value isn't determined by having all answers"
    ],
    "status": "completed",
    "createdAt": "2026-07-18T10:30:00Z"
  }
}
```

**Errors:**
- `404 Not Found` - Session doesn't exist
- `403 Forbidden` - Not your session

---

### POST `/sessions/:id/messages`

Send a message in an active session, get Claude AI response.

**Request:**
```json
{
  "content": "How do I overcome this feeling?"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "Great question. Let's trace where this comes from...",
    "timestamp": "2026-07-18T10:31:00Z"
  },
  "session": {
    "_id": "507f1f77bcf86cd799439012",
    "conversationHistory": [
      { "role": "user", "content": "How do I overcome this?" },
      { "role": "assistant", "content": "Great question..." }
    ]
  }
}
```

**Errors:**
- `404 Not Found` - Session doesn't exist
- `400 Bad Request` - Empty message
- `429 Too Many Requests` - Rate limit (max 30 messages/hour)

---

### PATCH `/sessions/:id/complete`

Mark session as completed and generate action items.

**Request:**
```json
{
  "finalIntensityScore": 6,
  "insights": ["Perfectionism is learned", "I don't need all answers"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session completed. Action items generated.",
  "session": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "completed",
    "fearIntensity": {
      "initialScore": 8,
      "finalScore": 6,
      "trend": "decreased"
    },
    "actionItems": [
      {
        "title": "Speak up in standup",
        "description": "Share one idea without perfecting it first",
        "priority": "high",
        "dueDate": "2026-07-25"
      }
    ],
    "keyInsights": [
      "Perfectionism is preventing progress",
      "Imperfection = learning opportunity"
    ]
  }
}
```

---

## 💳 Payment Endpoints

### POST `/payments/create-order`

Initiate a payment order (subscription).

**Request:**
```json
{
  "planType": "monthly",
  "amount": 19900
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "order": {
    "orderId": "order_HO2jqKVMq9Qvzl",
    "amount": 19900,
    "currency": "INR",
    "keyId": "rzp_test_xxxxxxxxxxxx"
  }
}
```

**Use in Frontend:**
```javascript
// Frontend: Initialize Razorpay checkout
const options = {
  key: response.order.keyId,
  amount: response.order.amount,
  currency: response.order.currency,
  name: "BeyondFear",
  description: "Premium Subscription",
  order_id: response.order.orderId,
  handler: function(response) {
    // Call verify endpoint
    verifyPayment(response.razorpay_payment_id, response.razorpay_signature)
  }
};
const rzp = new Razorpay(options);
rzp.open();
```

**Errors:**
- `400 Bad Request` - Invalid planType
- `409 Conflict` - User already has active subscription

---

### POST `/payments/verify`

Verify Razorpay payment signature and unlock sessions.

**Request:**
```json
{
  "orderId": "order_HO2jqKVMq9Qvzl",
  "paymentId": "pay_HO2kHM2jNm8L2z",
  "signature": "9ef4dffbfd84f1318f6..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment verified. Sessions unlocked!",
  "payment": {
    "_id": "507f1f77bcf86cd799439013",
    "orderId": "order_HO2jqKVMq9Qvzl",
    "paymentId": "pay_HO2kHM2jNm8L2z",
    "amount": 19900,
    "status": "captured",
    "sessionsUnlocked": true,
    "unlockedAt": "2026-07-18T10:35:00Z"
  },
  "user": {
    "subscription": {
      "status": "active",
      "planType": "monthly",
      "expiresAt": "2026-08-18"
    }
  }
}
```

**Errors:**
- `400 Bad Request` - Missing fields
- `402 Payment Required` - Signature verification failed
- `404 Not Found` - Order not found

---

### GET `/payments/history`

Get user's payment history.

**Response:** `200 OK`
```json
{
  "success": true,
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "orderId": "order_HO2jqKVMq9Qvzl",
      "amount": 19900,
      "currency": "INR",
      "status": "captured",
      "planType": "monthly",
      "processedAt": "2026-07-18T10:35:00Z",
      "expiresAt": "2026-08-18"
    }
  ]
}
```

---

### POST `/payments/webhook`

Razorpay webhook endpoint (async payment updates).

**Header:** `X-Razorpay-Signature: <signature>`

**Body:** Razorpay event payload

**Processing:**
- `payment.authorized` → Update payment status
- `payment.failed` → Log failure, notify user
- `payment.pending` → Retry or wait

**Response:** `200 OK`
```json
{ "success": true }
```

---

## 📊 Dashboard Endpoints

### GET `/dashboard`

Get user's dashboard statistics.

**Response:** `200 OK`
```json
{
  "success": true,
  "dashboard": {
    "sessionStats": {
      "totalSessions": 5,
      "completedSessions": 3,
      "activeSessions": 1,
      "archivedSessions": 1
    },
    "fearStats": {
      "avgInitialIntensity": 7.4,
      "avgFinalIntensity": 5.2,
      "improvementRate": "30%",
      "topFears": ["career", "relationships"],
      "totalActionItems": 8,
      "completedActions": 5
    },
    "subscriptionStats": {
      "status": "free",
      "sessionsRemaining": 2,
      "freeSessions": { "used": 1, "total": 3 }
    },
    "recentSessions": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "fearTitle": "Impostor Syndrome",
        "fearCategory": "career",
        "createdAt": "2026-07-18T10:30:00Z",
        "status": "completed"
      }
    ]
  }
}
```

---

## 🔄 Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional details if applicable"
  }
}
```

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing/invalid JWT token |
| `FORBIDDEN` | 403 | Access denied to resource |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `BAD_REQUEST` | 400 | Invalid request body |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT` | 429 | Too many requests |
| `PAYMENT_REQUIRED` | 402 | Subscription needed or sessions exhausted |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 🔗 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/sessions/:id/messages` | 30 | 1 hour |
| `/payments/create-order` | 10 | 1 hour |
| `/auth/login` | 5 failed attempts | 15 minutes |
| All endpoints | 100 | 1 minute |

---

## 📚 Example Flows

### Complete User Journey (Payment)

**1. Register**
```bash
POST /auth/register
{
  "email": "priya@example.com",
  "password": "Pass123!",
  "displayName": "Priya"
}
# Returns: JWT token
```

**2. Create Session**
```bash
POST /sessions
Authorization: Bearer <token>
{
  "fearTitle": "Impostor Syndrome",
  "fearDescription": "I feel like a fraud...",
  "fearCategory": "career"
}
# Returns: sessionId (this is free session 1 of 3)
```

**3. Exchange Messages**
```bash
POST /sessions/:id/messages
Authorization: Bearer <token>
{
  "content": "How do I overcome this?"
}
# Returns: Claude response
```

**4. Complete Session**
```bash
PATCH /sessions/:id/complete
Authorization: Bearer <token>
{
  "finalIntensityScore": 6
}
# Returns: Action items generated
```

**5. Hit Free Limit (4th Session)**
```bash
POST /sessions
Authorization: Bearer <token>
{...}
# Returns: 402 PAYMENT_REQUIRED
```

**6. Initiate Payment**
```bash
POST /payments/create-order
Authorization: Bearer <token>
{
  "planType": "monthly",
  "amount": 19900
}
# Returns: Razorpay order details
```

**7. Verify Payment (After Razorpay)**
```bash
POST /payments/verify
Authorization: Bearer <token>
{
  "orderId": "...",
  "paymentId": "...",
  "signature": "..."
}
# Returns: Payment confirmed, sessions unlocked
```

**8. Create Another Session**
```bash
POST /sessions
Authorization: Bearer <token>
{...}
# Returns: 201 Created (paid tier, unlimited)
```

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "displayName": "Test User"
  }'
```

### Create Session
```bash
curl -X POST http://localhost:5000/api/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fearTitle": "Fear of Failure",
    "fearDescription": "I am afraid of failing my exams...",
    "fearCategory": "career"
  }'
```

### Send Message
```bash
curl -X POST http://localhost:5000/api/sessions/<sessionId>/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What is the root cause?"
  }'
```

---

**Documentation Version:** 1.0  
**Last Updated:** 2026-07-18  
**Status:** MVP Ready

