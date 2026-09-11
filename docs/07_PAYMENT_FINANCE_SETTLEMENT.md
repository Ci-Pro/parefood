# Payment, Finance & Settlement Blueprint

## Payment methods
Architecture supports:
- cash
- bank transfer
- QRIS
- virtual account
- e-wallet
- future provider integrations

## Payment entities
- payment_transactions
- payment_events
- payment_proofs
- refunds
- refund_items/adjustments as required

## Financial separation
1. Customer payment
2. Merchant earnings
3. Driver earnings
4. Platform revenue
5. Refunds
6. Settlement

Never derive financial truth from UI state.

## Idempotency
Every provider webhook and critical payment command must have an idempotency key/event identity.

## Settlement
Merchant and driver settlement records must capture:
- period
- gross
- fees
- adjustments
- net
- status
- approved_by
- paid_at
