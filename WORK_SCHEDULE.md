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

### Phase 2: Core Product Flows

- [ ] Day 6 - Rebuild sessions list, session creation, and session loading
- [ ] Day 7 - Rebuild chat workspace and message thread using current backend APIs
- [ ] Day 8 - Reconnect action items, completion flow, and intensity scoring
- [ ] Day 9 - Rebuild dashboard/progress views on the new frontend

### Phase 3: Pricing and Payments

- [ ] Day 10 - Rebuild pricing presentation and subscription state surfaces
- [ ] Day 11 - Reconnect Razorpay order, verify, failure, and unlock flows
- [ ] Day 12 - Rebuild free-tier restrictions, paywall prompts, and premium gating

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
- [ ] Razorpay checkout flow restored
- [ ] Premium unlock state reflected in UI

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

### Day 6: Sessions

- [ ] Wire fetch sessions list
- [ ] Wire create session
- [ ] Wire load single session
- [ ] Wire rename session if supported in current UX
- [ ] Wire delete session with premium-only guard
- [ ] Reflect backend free-tier session limits in UI

### Day 7: Chat

- [ ] Wire message send flow to backend
- [ ] Render assistant and user messages correctly
- [ ] Support initial landing input -> session creation path
- [ ] Add loading and error states for send flow
- [ ] Verify one full conversation path manually

### Day 8: Completion and Progress Signals

- [ ] Wire action summary rendering
- [ ] Wire final intensity input and completion action
- [ ] Persist completion state in session list
- [ ] Verify session completion updates backend and refresh state

### Day 9: Dashboard

- [ ] Rebuild metrics from current session/payment APIs
- [ ] Rebuild charts/cards on the new UI system
- [ ] Show subscription status and recent sessions
- [ ] Verify dashboard with real seeded or live user data

### Day 10: Pricing Surface

- [ ] Replace template pricing with BeyondFear plans
- [ ] Show free vs premium capabilities clearly
- [ ] Reintroduce subscription badge/status surfaces
- [ ] Verify current plan labels match backend pricing config

### Day 11: Razorpay

- [ ] Load Razorpay SDK safely
- [ ] Create order from backend
- [ ] Handle success callback
- [ ] Verify payment signature with backend
- [ ] Handle cancellation and failure states
- [ ] Persist unlock state and refresh subscription status

### Day 12: Limits and Gating

- [ ] Enforce free-tier session restrictions in UI
- [ ] Gate incognito and premium-only features
- [ ] Show upgrade prompts at correct moments
- [ ] Verify premium user can create multiple sessions

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
