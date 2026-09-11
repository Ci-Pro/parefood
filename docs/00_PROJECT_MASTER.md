# PareFood — Project Master Blueprint
Version: 1.0
Status: Draft Baseline for Complex MVP

## Purpose
PareFood is a local-first food delivery platform for the Pare/Kediri area with four operational mobile applications and one admin web application.

## Product surfaces
1. Customer App
2. Merchant App
3. Driver App
4. Admin Mobile App
5. Admin Web

## Technology baseline
- Mobile: Expo + React Native + TypeScript
- Navigation: Expo Router
- State: Zustand
- Server state: TanStack Query
- Backend: Supabase
- Database: PostgreSQL
- Auth: Supabase Auth
- Authorization: PostgreSQL RLS
- Storage: Supabase Storage
- Realtime: Supabase Realtime
- Server logic: Supabase Edge Functions
- Admin Web: Next.js + TypeScript
- Monorepo: pnpm + Turborepo
- CI/CD: GitHub Actions + EAS + Vercel
- Monitoring: Sentry
- Maps: provider abstraction; Google Maps/Mapbox can be selected later
- Payments: provider abstraction; Midtrans/Xendit/manual/cash can be supported

## Non-negotiables
- No fake data in production.
- No placeholder business logic.
- No direct client mutation for critical financial/order operations.
- Every critical state transition must be validated server-side.
- All database changes are migration-first.
- Every feature must have acceptance criteria and tests.
- UI language: Indonesian.
- Source code: English.
- Database identifiers: English.
