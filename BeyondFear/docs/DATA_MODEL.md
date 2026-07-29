# BeyondFear: Data Model & MongoDB Schema

---

## 📊 Database Overview

**Database Name:** `beyondfear-dev` (local) or `beyondfear-prod` (production)

**Collections:** 4 main collections
1. **users** - User accounts & profiles
2. **sessions** - Fear journaling + AI dialogues
3. **payments** - Payment records & subscriptions
4. **actions** - Action tracking within sessions

---

## 👤 Users Collection

**Purpose:** Store user identity, preferences, subscription status

```javascript
{
  _id: ObjectId,
  
  // Authentication
  email: String,                    // "priya@example.com"
  passwordHash: String,             // bcrypt hashed
  
  // Profile
  displayName: String,              // "Priya S."
  createdAt: Date,                  // 2026-07-18T10:30:00Z
  lastLoginAt: Date,                // 2026-07-18T14:22:00Z
  
  // Subscription Status
  subscription: {
    status: String,                 // "free" | "premium"
    planType: String,               // "monthly" | "annual" | "lifetime"
    freeSessions: {
      used: Number,                 // How many free sessions used
      total: Number,                // Free tier limit (1)
    },
    paidSessions: {
      unlockDate: Date,             // When premium unlocked
      expiresAt: Date,              // Expiry date (if recurring)
    },
  },
  
  // Privacy
  anonymityPreference: Boolean,     // true = anonymous logs
  dataRetention: String,            // "30-days" | "90-days" | "forever"
  
  // Metadata
  isActive: Boolean,                // true = not deleted
  lastPaymentId: ObjectId,          // FK to payments collection
}
```

**Indexes:**
```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ "subscription.status": 1 });
```

---

## 📝 Sessions Collection

**Purpose:** Store fear journaling entries + AI conversation transcripts + action logs

```javascript
{
  _id: ObjectId,
  
  // Relationship
  userId: ObjectId,                 // FK to users
  
  // Fear & Metadata
  fearTitle: String,                // "Impostor syndrome"
  fearDescription: String,          // Full description user entered
  fearCategory: String,             // "career" | "relationships" | "health" | "personal"
  
  // Conversation
  conversationHistory: [
    {
      role: String,                 // "user" | "assistant"
      content: String,              // The actual message
      timestamp: Date,
      tokenCount: Number,           // For API usage tracking
    }
  ],
  
  // Progress Tracking
  fearIntensity: {
    initialScore: Number,           // 1-10 when session started
    finalScore: Number,             // 1-10 after dialogue
    trend: String,                  // "decreased" | "increased" | "stable"
  },
  
  // Action Items (from dialogue)
  actionItems: [
    {
      title: String,                // "Speak up in next standup"
      description: String,
      dueDate: Date,
      completed: Boolean,
      completedAt: Date,
      priority: String,             // "high" | "medium" | "low"
    }
  ],
  
  // Session Status
  status: String,                   // "active" | "completed" | "archived"
  
  // Encryption (Optional)
  isEncrypted: Boolean,             // true = transcript is encrypted
  encryptedTranscript: String,      // AES-256 encrypted copy (if enabled)
  encryptionKey: String,            // Store securely or regenerate on-demand
  
  // Timestamps
  createdAt: Date,
  completedAt: Date,
  updatedAt: Date,
  
  // Metadata
  sessionDuration: Number,          // Seconds
  keyInsights: [String],            // ["Root cause is perfectionism", "Direction: lead small feature"]
}
```

**Action Logs Collection**

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: ObjectId,
  title: String,
  description: String,
  actionType: String,             // "breathing" | "reflection" | "behavior-change" | "goal"
  status: String,                 // "pending" | "in-progress" | "completed" | "skipped"
  dueDate: Date,
  completedAt: Date,
  skippedAt: Date,
  priority: String,               // "high" | "medium" | "low"
  difficulty: String,             // "easy" | "medium" | "hard"
  attempts: Number,
  completionNotes: String,
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
```javascript
db.sessions.createIndex({ userId: 1, createdAt: -1 });
db.sessions.createIndex({ status: 1 });
db.sessions.createIndex({ "fearIntensity.initialScore": 1 });
```

---

## 💳 Payments Collection

**Purpose:** Track payment records, subscriptions, and unlock history

```javascript
{
  _id: ObjectId,
  
  // Relationship
  userId: ObjectId,                 // FK to users
  
  // Payment Metadata
  orderId: String,                  // Razorpay order_id: "order_HO2jqKVMq9Qvzl"
  paymentId: String,                // Razorpay payment_id: "pay_HO2kHM2jNm8L2z"
  
  // Amount
  amount: Number,                   // In paise: 19900 = INR 199
  currency: String,                 // "INR" | "USD"
  
  // Payment Details
  paymentMethod: String,            // "card" | "netbanking" | "upi" | "wallet"
  paymentGateway: String,           // "razorpay" | "stripe"
  
  // Card Details (Masked)
  cardLast4: String,                // "1111"
  cardBrand: String,                // "Visa" | "Mastercard"
  
  // Status Tracking
  status: String,                   // "created" | "attempted" | "captured" | "failed" | "refunded"
  statusHistory: [
    {
      status: String,
      timestamp: Date,
      note: String,
    }
  ],
  
  // Subscription Details
  planDetails: {
    planType: String,               // "monthly" | "annual" | "lifetime"
    duration: Number,               // 30 (days)
    sessionsUnlocked: Number,       // Unlimited = -1
  },
  
  // Unlocking Sessions
  sessionsUnlocked: Boolean,        // true = user now has premium access
  unlockedAt: Date,
  expiresAt: Date,                  // For recurring subscriptions
  
  // Refund Information (if applicable)
  refundId: String,                 // Razorpay refund_id
  refundReason: String,
  refundAmount: Number,
  refundedAt: Date,
  
  // Metadata
  userEmail: String,                // For receipts
  receiptUrl: String,               // Link to invoice
  failureReason: String,            // If payment failed
  attemptCount: Number,             // Retry attempts
  
  // Timestamps
  createdAt: Date,                  // Order created
  processedAt: Date,                // Payment confirmed
  expiresAt: Date,                  // For pending orders (24h TTL)
}
```

**Indexes:**
```javascript
db.payments.createIndex({ userId: 1, createdAt: -1 });
db.payments.createIndex({ orderId: 1 }, { unique: true });
db.payments.createIndex({ paymentId: 1 }, { unique: true });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ "planDetails.planType": 1 });
db.payments.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // TTL index
```

---

## ✅ Actions Collection

**Purpose:** Track user's action commitments and completion

```javascript
{
  _id: ObjectId,
  
  // Relationships
  userId: ObjectId,                 // FK to users
  sessionId: ObjectId,              // FK to sessions
  
  // Action Details
  title: String,                    // "Speak up in standup"
  description: String,
  actionType: String,               // "breathing" | "reflection" | "behavior-change" | "goal"
  
  // Status & Timeline
  status: String,                   // "pending" | "in-progress" | "completed" | "skipped"
  dueDate: Date,
  completedAt: Date,
  skippedAt: Date,
  
  // Priority
  priority: String,                 // "high" | "medium" | "low"
  difficulty: String,               // "easy" | "medium" | "hard"
  
  // Tracking
  attempts: Number,                 // How many times user tried
  completionNotes: String,          // User's reflection on completion
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
}
```

---

## 🔄 Relationships (ER Diagram)

```
Users (1) ──→ (many) Sessions
  │              ├→ Conversation History
  │              ├→ Action Items
  │              └→ Fear Intensity
  │
  └──→ (many) Payments
         ├→ Subscription Status
         └→ Payment Status
         
Sessions (1) ──→ (many) Actions
```

---

## 💾 MongoDB Atlas Setup

### Collections to Create

```javascript
// In MongoDB Atlas web console, create these collections:

use beyondfear-dev

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "passwordHash", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        email: { bsonType: "string" },
        passwordHash: { bsonType: "string" },
        // ... other fields
      }
    }
  }
})

db.createCollection("sessions")
db.createCollection("payments")
db.createCollection("actions")
```

### Indexes to Create

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });

// Sessions
db.sessions.createIndex({ userId: 1, createdAt: -1 });
db.sessions.createIndex({ status: 1 });

// Payments
db.payments.createIndex({ userId: 1, createdAt: -1 });
db.payments.createIndex({ orderId: 1 }, { unique: true });
db.payments.createIndex({ status: 1 });

// Actions
db.actions.createIndex({ userId: 1, sessionId: 1 });
db.actions.createIndex({ status: 1 });
```

---

## 📈 Query Examples

### Get User's Free Sessions Used
```javascript
db.users.findOne({ _id: userId })
  .projection({ "subscription.freeSessions": 1 })
```

### Get All Sessions for a User
```javascript
db.sessions
  .find({ userId: userId, status: { $ne: "archived" } })
  .sort({ createdAt: -1 })
  .limit(10)
```

### Get Payment History
```javascript
db.payments
  .find({ userId: userId, status: "captured" })
  .sort({ createdAt: -1 })
```

### Get Completed Actions This Month
```javascript
db.actions.find({
  userId: userId,
  status: "completed",
  completedAt: { $gte: new Date("2026-07-01"), $lt: new Date("2026-08-01") }
})
```

### Calculate User's Fear Intensity Trend
```javascript
db.sessions
  .find({ userId: userId })
  .projection({ "fearIntensity.initialScore": 1, "fearIntensity.finalScore": 1, createdAt: 1 })
  .sort({ createdAt: -1 })
  .limit(10)
```

---

## 🔐 Data Privacy & Security

### Encryption Points
- **Passwords:** Bcrypt (10 rounds)
- **JWT Tokens:** HS256 with secret
- **Sensitive transcripts:** Optional AES-256 encryption
- **Database:** MongoDB encrypted at rest (Atlas free tier included)

### Retention Policy
- **Free tier sessions:** Auto-delete after 30 days of inactivity
- **Paid tier sessions:** Keep indefinitely or per user preference
- **Payments:** Keep for 7 years (compliance)
- **Logs:** Keep for 90 days

---

## 📊 Aggregation Pipeline Examples

### Dashboard: User's Fear Trends
```javascript
db.sessions.aggregate([
  { $match: { userId: ObjectId("...") } },
  { $group: {
    _id: null,
    totalSessions: { $sum: 1 },
    avgInitialIntensity: { $avg: "$fearIntensity.initialScore" },
    avgFinalIntensity: { $avg: "$fearIntensity.finalScore" },
    categories: { $push: "$fearCategory" }
  }}
])
```

### Revenue Report: Monthly Payment Summary
```javascript
db.payments.aggregate([
  { $match: { status: "captured", processedAt: { $gte: startOfMonth } } },
  { $group: {
    _id: "$planDetails.planType",
    totalRevenue: { $sum: "$amount" },
    transactionCount: { $sum: 1 },
    avgTransactionValue: { $avg: "$amount" }
  }}
])
```

---

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| `email` | Valid email format | `priya@example.com` |
| `passwordHash` | Min 60 chars (bcrypt) | `$2b$10$...` |
| `amount` | Positive integer | `19900` (paise) |
| `status` | Enum value | `"captured"` |
| `fearIntensity` | 1-10 integer | `7` |
| `dueDate` | Future date | `2026-07-25T00:00:00Z` |

---

## 🚀 Next Steps

1. Create MongoDB Atlas cluster (free tier)
2. Create collections listed above
3. Create indexes for performance
4. Test queries with sample data
5. Monitor storage usage (free tier: 512MB)

