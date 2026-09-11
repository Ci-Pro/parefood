# API & Edge Function Contract

## Commands
- create-order
- calculate-checkout
- apply-promotion
- confirm-payment
- payment-webhook
- merchant-accept-order
- merchant-reject-order
- mark-preparing
- mark-ready
- assign-driver
- driver-accept-delivery
- confirm-pickup
- confirm-delivery
- cancel-order
- request-refund
- approve-refund
- create-settlement
- send-notification

## Query/read patterns
Reads may use Supabase client with RLS where safe.
Commands with financial/state consequences must be server controlled.

## API contract rule
Every command defines:
- input schema
- authentication
- authorization
- validation
- transaction
- side effects
- output
- error codes
- idempotency behavior
