# Order State Machine

## Main states
PENDING_PAYMENT
PAID
WAITING_MERCHANT
MERCHANT_ACCEPTED
PREPARING
READY_FOR_PICKUP
DRIVER_ASSIGNED
DRIVER_PICKING_UP
PICKED_UP
ON_DELIVERY
DELIVERED
COMPLETED

## Failure/terminal states
CANCELLED_BY_CUSTOMER
CANCELLED_BY_MERCHANT
CANCELLED_BY_ADMIN
REJECTED_BY_MERCHANT
REFUND_PENDING
REFUNDED
FAILED

## Rules
Each transition has:
- actor
- preconditions
- authorization
- timestamp
- optional reason
- audit event

Example:
WAITING_MERCHANT → MERCHANT_ACCEPTED
requires merchant ownership, order not expired/cancelled, and valid merchant status.

READY_FOR_PICKUP → DRIVER_ASSIGNED
requires an eligible driver assignment.

ON_DELIVERY → DELIVERED
requires driver authorization and delivery confirmation/proof according to policy.
