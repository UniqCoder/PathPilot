# PathPilot Project Documentation

Version: 1.0.0  
Last Updated: 2026-04-19  
Owner: Product + Engineering

## 1. Document Purpose

This document is the single source of truth for:

1. Product Requirements Document (PRD)
2. Technical Product Specification
3. Spec-Driven Development operating model

It is intended to support planning, implementation, QA, release, and future scaling of PathPilot.

## 2. Product Requirements Document (PRD)

### 2.1 Product Vision

PathPilot helps students and early-career professionals understand career risk and generate a practical action roadmap with AI-driven recommendations.

### 2.2 Problem Statement

Users often do not know:

1. Whether their current skill profile is becoming risky in the market
2. Which skills are safe vs decaying
3. What concrete weekly actions can improve their outcomes

Current alternatives are generic, not personalized, and often disconnected from execution.

### 2.3 Target Users

Primary users:

1. College students (Tier 1/2/3) preparing for placements
2. Early-career engineers (0-3 years experience)
3. Career switch aspirants trying to become market-relevant

Secondary users:

1. Peers comparing profile strength (Battle mode)
2. Mentors reviewing structured career reports

### 2.4 Core Value Proposition

PathPilot provides:

1. A quantified risk score
2. Personalized breakdown of risk drivers
3. Pivot recommendations with immediate next actions
4. Weekly execution plan and premium deep-dive unlocks

### 2.5 Product Goals

Business goals:

1. Convert free report users into premium roadmap unlocks
2. Build retention through dashboard history and recurring value
3. Create engagement loops via battle and shareable artifacts

User outcomes:

1. Faster clarity on career risk
2. Better project choices aligned with market demand
3. Improved execution consistency via weekly plans

### 2.6 Non-Goals

Current non-goals:

1. Full job application management system
2. Live interview simulator
3. Multi-tenant enterprise coaching platform

### 2.7 Functional Scope (Current)

1. Auth (email/password with Supabase)
2. Intake form and AI report generation
3. Report persistence and dashboard history
4. Premium payments via Razorpay
5. Battle mode (create, join, compare)
6. PDF export for unlocked reports
7. Basic transactional email support

### 2.8 User Journeys

Journey A: New user to first report

1. User signs up/signs in
2. User fills intake form
3. User receives free report with gated premium sections

Journey B: Premium unlock

1. User clicks pay button for roadmap
2. System creates Razorpay order
3. User completes payment
4. System verifies signature and marks payment captured
5. Premium sections unlock

Journey C: Historical access

1. User opens dashboard
2. System fetches saved reports for user
3. User reopens specific report

Journey D: Battle mode

1. User creates battle room
2. Friend joins via battle link/id
3. System computes and displays comparative outcome

### 2.9 Success Metrics (Initial)

1. Report generation completion rate
2. Payment conversion rate (free to premium)
3. 7-day and 30-day return rate
4. Battle feature adoption rate
5. PDF export usage rate

## 3. Technical Product Specification

### 3.1 System Context

Application type:

1. Next.js App Router web app
2. Server-rendered dynamic routes and API route handlers
3. Supabase-backed auth and data persistence

### 3.2 Technology Stack

1. Next.js 16 + React 19 + TypeScript
2. Supabase (Auth + Postgres)
3. Razorpay payments
4. Upstash Redis rate-limiting
5. Resend for emails
6. PostHog analytics
7. React PDF renderer for report exports
8. Vitest for unit tests

### 3.3 Route Inventory

UI routes:

1. /
2. /auth
3. /intake
4. /report
5. /dashboard
6. /battle
7. /battle/join/[battleId]
8. /battle/results/[battleId]

API routes:

1. /api/generate-report
2. /api/reports/[reportId]
3. /api/payments/create-order
4. /api/payments/verify
5. /api/payments/status
6. /api/payments/webhook
7. /api/export/pdf
8. /api/email/send
9. /api/battle/create
10. /api/battle/[battleId]
11. /api/battle/[battleId]/join

### 3.4 Data Model

Primary tables:

1. public.profiles
2. public.reports
3. public.payments
4. public.battles

Data constraints:

1. RLS enabled on all tables
2. reports and payments tied to authenticated user ownership where applicable
3. battle_id unique for room routing

Auth trigger:

1. handle_new_user inserts a profile row when auth.users entry is created

### 3.5 Payment Plans

Defined plans:

1. battle-report-49
2. full-roadmap-99
3. shadow-you

Expiry policy:

1. battle-report-49: no expiry
2. full-roadmap-99: no expiry
3. shadow-you: 30 days

### 3.6 Security and Reliability Controls

1. Protected route handling through auth middleware
2. RLS-backed data isolation in Supabase
3. Razorpay signature verification before unlock
4. Rate limits applied for sensitive endpoints
5. Graceful fallback messages for missing schema/bootstrap states

### 3.7 Environment Specification

Required variables:

1. NEXT_PUBLIC_SUPABASE_URL
2. NEXT_PUBLIC_SUPABASE_ANON_KEY
3. SUPABASE_SERVICE_ROLE_KEY
4. RAZORPAY_KEY_ID
5. RAZORPAY_KEY_SECRET
6. NEXT_PUBLIC_RAZORPAY_KEY_ID
7. UPSTASH_REDIS_REST_URL
8. UPSTASH_REDIS_REST_TOKEN
9. RESEND_API_KEY
10. NEXT_PUBLIC_POSTHOG_KEY
11. NEXT_PUBLIC_POSTHOG_HOST

### 3.8 Deployment Specification

Target platform:

1. Vercel (Node.js runtime)

Pre-deploy checks:

1. npm run lint
2. npm run test
3. npm run build

Infra prerequisites:

1. Supabase schema migration executed from supabase/migrations/001_init.sql
2. Razorpay dashboard keys configured per environment
3. Environment variables set in Vercel project settings

### 3.9 Known Operational Pitfalls

1. Missing Supabase schema causes reports/payments/dashboard errors
2. Empty Razorpay keys block order creation
3. Stale local report IDs must be persisted before payment attempts

## 4. Spec-Driven Development Model

### 4.1 Why Spec-Driven for PathPilot

PathPilot includes payments, auth, data ownership, and premium entitlements. Spec-driven delivery reduces regressions and keeps business logic auditable.

### 4.2 Artifact Hierarchy

For each feature, create artifacts in this order:

1. PRD slice
2. Functional specification
3. API/data contract
4. Test specification
5. Rollout and monitoring plan

### 4.3 Standard Delivery Workflow

Step 1: Problem framing

1. Define user pain and target outcome
2. Define measurable success criteria

Step 2: PRD slice

1. Scope
2. Non-goals
3. Acceptance criteria

Step 3: Engineering spec

1. Component/file changes
2. API contract changes
3. Data migration changes
4. Edge cases and failure modes

Step 4: Test design

1. Unit tests
2. Integration tests
3. Manual smoke checklist

Step 5: Implementation

1. Build against approved spec
2. No undocumented scope expansion

Step 6: Verification

1. Lint, test, build
2. User flow validation
3. Observability checks

Step 7: Release and post-release

1. Deploy
2. Monitor key metrics and error rates
3. Document learnings and update specs

### 4.4 Definition of Ready (DoR)

A feature is ready only if:

1. PRD slice is written and approved
2. Acceptance criteria are explicit and testable
3. API/data impacts are identified
4. Dependencies and risks are documented

### 4.5 Definition of Done (DoD)

A feature is done only if:

1. All acceptance criteria pass
2. Lint, tests, and build are green
3. Security and auth assumptions are validated
4. Documentation is updated
5. Rollback approach is known

### 4.6 Traceability Matrix (Template)

Maintain traceability in each feature PR:

1. Requirement ID -> Spec section -> Implementation files -> Tests

Example format:

1. REQ-PAY-001 -> Payment create-order contract -> src/app/api/payments/create-order/route.ts -> payment route tests
2. REQ-REP-003 -> Premium unlock refresh flow -> src/app/report/page.tsx -> report flow smoke test

### 4.7 Change Management Rules

1. Any behavior change must reference a requirement ID
2. Any schema change must include migration and rollback notes
3. Any payment logic change must include explicit failure-mode handling

## 5. Release Readiness Checklist

1. Environment variables configured in target environment
2. Supabase migration verified in target project
3. Razorpay keys and webhook secret configured
4. Lint/test/build all pass
5. Auth, report generation, payment, dashboard, and PDF export smoke-tested

## 6. Immediate Next Milestones

Milestone 1: Production hardening

1. Add integration tests for payment and report persistence flows
2. Add alerting for API error spikes
3. Add structured logging for payment lifecycle

Milestone 2: Conversion and retention

1. Improve paywall copy experiments
2. Add cohort analytics for premium conversion
3. Add lifecycle email sequences

Milestone 3: Scale readiness

1. Add caching strategy for report retrieval
2. Add queue/offload for heavy report generation tasks
3. Add synthetic uptime and webhook health checks

## 7. Developer Quick Commands

1. npm install
2. npm run dev
3. npm run lint
4. npm test
5. npm run build

## 8. Canonical Project References

1. README.md
2. supabase/migrations/001_init.sql
3. src/app/api/*
4. src/app/*
5. src/lib/*
