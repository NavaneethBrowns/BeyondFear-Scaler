# BeyondFear Work Schedule

Use this file as the running checklist for implementation. Tick items off as they are completed.

## Where We Stand

- Current date: 2026-07-23
- Overall status: Day 1 through Day 7 are complete. Frontend design system, auth flow, session persistence, backend chat/action-log flow, frontend integration with session/message APIs, and conversation thread flow are in place.
- Immediate next step: Day 8 backend payments hardening and Day 9 frontend unlock edge-case pass.

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

- [ ] Day 8 - Backend payments
- [ ] Day 9 - Frontend payments and unlock flow
- [ ] Day 10 - Dashboard and progress views
- [ ] Day 11 - End-to-end testing
- [ ] Day 12 - Mobile responsiveness pass
- [ ] Day 13 - Polish, loading states, and edge cases
- [ ] Day 14 - Deployment and final verification

## Current Focus

- [x] Aurora dark theme and polished CTA styling
- [x] Homepage messaging shifted to user-first language
- [x] Homepage reframed for dharmic direction-finding (not therapy)
- [x] Login and signup pages updated to match the new design system
- [x] Navbar updated with the aurora visual language

## Next Build Steps

### Core App Flow

- [ ] Build the ChatPage conversation UI
- [ ] Add message history and input handling
- [ ] Connect the chat UI to the backend chat endpoint
- [ ] Add loading, error, and empty states

### Authentication

- [x] Add auth context and token storage
- [x] Persist login state across refreshes
- [x] Protect authenticated routes

### Sessions

- [ ] Add session persistence with localStorage
- [ ] Sync session history with the API
- [ ] Add session list or archive view

### Account Pages

- [ ] Create ProfilePage
- [ ] Create SettingsPage
- [ ] Add account and privacy controls

### Backend API

- [ ] Implement POST /chat
- [ ] Implement GET /sessions
- [ ] Add any missing session or auth routes
- [ ] Wire request validation and error handling

### Polish and Validation

- [ ] Test mobile layout on small screens
- [ ] Verify conversation flow end to end
- [ ] Fix UI edge cases and spacing issues
- [ ] Confirm production build succeeds

## Working Notes

- Keep this file updated instead of spreading the plan across multiple documents.
- Prefer small, reviewable changes per task.
- Mark a task complete only after it is verified in the app.
- Backend is Mongo-only and requires a reachable MONGODB_URI at startup.