# BeyondFear Work Schedule

Use this file as the single implementation checklist for the revamp. Mark work done only after it is verified in the running app.

## Where We Stand

- Current date: 2026-08-01
- Overall status: backend foundation exists, but the frontend was reset to a new React/TanStack baseline and must be re-integrated with BeyondFear product flows.
- Planning rule: treat old frontend-complete status as invalid. Rebuild and re-verify the user journey on the new frontend.
- Immediate next step: reconnect the new frontend to auth, session, pricing, payment, and dashboard flows in a clean sequence.

## Status Key

- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked

## Revamp Principles

- Keep the new frontend design baseline.
- Preserve working backend logic where possible.
- Rebuild UX and integration around the new frontend, not around the previous JSX app.
- Verify each day in browser before moving on.
- Do not mark payment or unlock flows complete without a full test path.

## Revamp Schedule

### Phase 1: Frontend Foundation Reset

- [x] Day 1 - Replace old frontend with the Fearless Path Finder baseline
- [x] Day 2 - Make the new frontend run on Node 20 in local dev
- [x] Day 3 - Re-establish app shell, route structure, and BeyondFear navigation
- [x] Day 4 - Rebuild login and signup screens against current backend auth
- [x] Day 5 - Rebuild authenticated state, logout flow, and protected navigation

### Phase 2: Core Product Flows (Day 6-9)

- [~] Day 6 - Session policy hardening: enforce one free session total, block duplicate creation, route 0 sessions to chat
- [~] Day 7 - AI conversation quality pass: in-chat intensity capture, one-fear-per-session flow, and scope integrity redirects
- [ ] Day 8 - Action quality loop: microaction generation guardrails, completion logic, and fear-thread continuity
- [ ] Day 9 - Progress correctness: expose progress only for users with 1+ sessions, validate metrics consistency

### Phase 3: Payments and Premium Unlock (Day 10-12)

- [ ] Day 10 - Razorpay test-mode integration complete in local: order creation, checkout, callback, signature verification
- [ ] Day 11 - Subscription reliability in local: webhook confirmation, retries/idempotency, failure recovery, unlock sync
- [ ] Day 12 - Local go-live gate: end-to-end QA from new user to paid unlock and launch-readiness decision

### Phase 4: Stability and Delivery

- [ ] Day 13 - Mobile responsiveness pass on the new frontend
- [ ] Day 14 - Full end-to-end verification: signup -> chat -> session limit -> payment -> unlock -> dashboard
- [ ] Day 15 - Deployment verification and production cleanup
- [ ] Day 16+ - Additional revamp polish, edge cases, and post-launch fixes

## Current Focus

- [x] Fresh frontend baseline copied in
- [x] Node 20-compatible TanStack Start version selected
- [x] Dev server made to run after server-entry mismatch fix
- [x] BeyondFear branding and product IA mapped onto the new frontend
- [x] Login page wired to backend auth API
- [x] Signup page wired to backend auth API
- [x] Auth token persistence and protected routes restored
- [ ] Sessions API wired into chat/sidebar flow
- [ ] Pricing cards updated to real BeyondFear plans
- [~] Razorpay checkout flow wired (pending local runtime verification)
- [~] Premium unlock state refresh wired (pending local runtime verification)

## Detailed Task Breakdown

### Day 3: App Shell and Navigation

- [x] Confirm route map for home, login, signup, chat, dashboard
- [x] Replace template branding/content with BeyondFear copy and structure
- [x] Define shared layout/header/footer behavior
- [x] Ensure unauthenticated and authenticated entry states are clear

### Day 4: Login and Signup

- [x] Audit current backend auth endpoints and payloads
- [x] Wire login form submit to backend
- [x] Wire signup form submit to backend
- [x] Persist auth token and user profile
- [x] Add loading, error, and success states
- [x] Verify login/logout round trip manually

### Day 5: Auth State and Protected Navigation

- [x] Restore session from local storage/token on refresh
- [x] Redirect unauthenticated users away from protected routes
- [x] Show correct nav CTAs for guest vs authenticated user
- [x] Verify logout clears client state fully

### Day 6: Auth + Session Gating (Top Priority)

- [x] Free user session creation hard cap protected server-side (exactly one total)
- [x] Duplicate starter-session race condition protection (frontend + backend)
- [x] Post-login default route to chat/sessions, not progress
- [x] Progress route guard for 0-session users
- [ ] Regression test: free user cannot create second session in any tab/reload pattern

### Day 7: AI Conversation Quality Lock

- [x] Intensity collection moved into chat conversation flow
- [x] AI asks intensity (1-10) after fear is identified and score absent
- [~] One-fear-per-session behavior: if a second fear appears, park it and return to first fear completion
- [ ] Stage-based tonality mapping implemented (supportive/direct/challenging)
- [ ] Scope integrity enforcement ladder implemented (drift, jailbreak, third-party, conscience-fear checks)

### Day 8: Action and Completion Integrity

- [ ] Microaction whitelist enforcement (safe, legal, consensual, no dangerous exposure)
- [ ] Action generation only after diagnosis/root/intensity conditions are met
- [ ] Pre/post intensity checkpoints for each microaction
- [ ] Completion requires evidence loop (attempt -> reflection -> recheck)

### Day 9: Progress Page Correctness

- [ ] Validate dashboard metrics against stored session truth (initial/final intensity, completion counts)
- [ ] Ensure 0 sessions always route to chat
- [ ] Ensure 1+ sessions can open progress page
- [ ] Verify free and premium views both reflect correct plan state

### Day 10: Razorpay Real Integration (Local + Test Mode)

- [ ] Backend order creation with plan metadata and amount validation
- [ ] Frontend checkout flow with success/failure/cancel handling
- [ ] Signature verification and payment status persistence
- [ ] Unlock premium immediately after verified payment

### Day 11: Payment Reliability + Recovery

- [ ] Webhook handling with idempotency keys
- [ ] Retry-safe verify path (no duplicate premium grants)
- [ ] Failure diagnostics surfaced in UI and logs
- [ ] Subscription state refresh strategy (client + server)

### Day 12: Local Go-Live Decision Day

- [ ] Full user-journey QA in local: new user -> one free session -> paywall -> Razorpay test payment -> unlock -> multi-session -> progress
- [ ] Browser smoke on critical flow (Chrome primary)
- [ ] Launch-readiness review with only P0/P1 blockers considered

## Day 12 Acceptance Criteria (Must Pass)

- [ ] Free user can create exactly one session and continue it indefinitely
- [ ] Free user cannot create second session until payment verification succeeds
- [ ] AI follows Beyond Fear tone, scope, and safety boundaries in real conversations
- [ ] Razorpay test payment in local unlocks premium immediately and persists after refresh/login
- [ ] Webhook or verify retries do not duplicate charges or duplicate entitlements
- [ ] New user end-to-end path works without manual DB fixes

## What Is Needed Now To Execute Day 10-12

- [x] Razorpay test key ID and key secret (local test mode)
- [ ] Razorpay webhook secret and webhook events enabled list
- [x] Environment for this phase: local only
- [x] Backend env values for JWT and Mongo confirmed present
- [ ] Staging details deferred until post-Day-12 local pass
- [ ] QA ownership intentionally deferred for MVP
- [x] Session behavior lock confirmed: one free total session, reusable until completion, second fear is parked and user is guided back to finish first fear thread
- [x] Provisional verify retry policy (local): 3 attempts with backoff 5s, 20s, 60s

## Payment Behavior (Locked For Current Phase)

- [x] Unlock premium immediately after successful `/api/payments/verify` signature verification
- [x] Webhook-first unlock is deferred for this phase; webhook is treated as reliability/reconciliation path
- [x] Verification definition: signature verification and subscription activation at `/api/payments/verify`

## Tradeoff Rule (Locked)

- [x] Optimize for user experience first, with balanced risk on speed vs reliability

### Day 13-16: Verification and Ship Readiness

- [ ] Mobile pass across home, auth, chat, dashboard, pricing modal
- [ ] Browser sanity check across primary flows
- [ ] End-to-end manual QA checklist
- [ ] Deployment smoke test
- [ ] Remove stale template copy and dead code
- [ ] Capture final known issues list if any remain

## Blocking Risks

- [ ] TanStack Start template still contains generic template behavior that may conflict with BeyondFear routing assumptions
- [ ] Payment flow cannot be marked complete without valid Razorpay test credentials
- [ ] Dashboard verification depends on real session data being available
- [ ] Node 20 is working, but package ecosystem is still closer to Node 22 expectations

## Working Notes

- The previous Day 1-14 status belonged to the old frontend implementation and should not be used for current planning.
- Backend logic should be reused where it still matches product rules.
- Treat auth, sessions, pricing, and Razorpay as reopened integration tasks.
- Keep this file current as the source of truth for the revamp.
