# BeyondFear Work Schedule

Use this file as the running checklist for implementation. Tick items off as they are completed.

## Where We Stand

- Current date: 2026-07-31
- Overall status: Day 1 through Day 8 are complete. Day 9 core frontend payment/unlock flow and Day 10 dashboard implementation are now coded. Day 11 final E2E verification and Day 14 deployment verification require a working non-VPN runtime environment.
- Immediate next step: Verify Day 9 to Day 13 flows on personal PC (non-VPN), then execute Day 14 deployment on Vercel + Render.

## Status Key

- [ ] Not started
- [x] Done

## Overall Planned Schedule

### Week 1: Foundation & Core

- [x] Day 1 - Frontend visual system and landing experience
- [x] Day 2 - Backend auth and login flow
- [x] Day 3 - Backend sessions and persistence
- [x] Day 4 - Backend chat logic and response flow
- [x] Day 5 - App routing and frontend integration
- [x] Day 6 - Chat input and message capture
- [x] Day 7 - Conversation thread and first full user flow

### Week 2: Payments, Polish, and Delivery

- [x] Day 8 - Backend payments
- [x] Day 9 - Frontend payments and unlock flow
- [x] Day 10 - Dashboard and progress views
- [ ] Day 11 - End-to-end testing (pending runtime verification)
- [x] Day 12 - Mobile responsiveness pass
- [x] Day 13 - Polish, loading states, and edge cases
- [ ] Day 14 - Deployment and final verification

## Current Focus

- [x] Aurora dark theme and polished CTA styling
- [x] Homepage messaging shifted to user-first language
- [x] Homepage reframed for dharmic direction-finding (not therapy)
- [x] Login and signup pages updated to match the new design system
- [x] Navbar updated with the aurora visual language
- [x] Backend payments: Razorpay integration with signature verification
- [x] Payment tracking: Payment model with transaction audit logs
- [x] Pricing tiers: 3 plans (₹199/month, ₹499/quarter, ₹799/year)
- [x] Session limits: Enforcement at route level
- [x] Free tier: 1 session/month with auto-reset logic
- [x] Subscription expiry: Auto-downgrade premium to free when expired

## Next Build Steps

### Day 9: Frontend Payments & Unlock Flow

- [x] Create Payment/Pricing modal component
- [x] Integrate Razorpay SDK in Chat page
- [x] Handle payment success callback
- [x] Handle payment failure callback  
- [x] Show "Upgrade to Premium" CTA when limit hit
- [x] Display subscription status in sidebar
- [x] Show session remaining badge
- [ ] Unlock animation when premium activated

### Day 10-14: Polish, Testing, Deployment

- [x] Dashboard/progress views
- [ ] End-to-end payment flow testing
- [x] Mobile responsiveness pass
- [x] Loading states and edge cases
- [ ] Deployment to staging/production
- [ ] Final verification and sign-off

## Working Notes

- Keep this file updated instead of spreading the plan across multiple documents.
- Prefer small, reviewable changes per task.
- Mark a task complete only after it is verified in the app.
- Backend is Mongo-only and requires a reachable MONGODB_URI at startup.