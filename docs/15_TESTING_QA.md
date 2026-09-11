# Testing & QA Strategy

## Unit tests
- pricing
- promotion eligibility
- delivery fee
- state transition validation
- permission checks
- money calculations

## Integration tests
- create order
- payment confirmation/webhook
- merchant accept
- driver assignment
- pickup
- delivery
- cancellation/refund
- settlement

## E2E
Customer complete purchase.
Merchant process order.
Driver complete delivery.
Admin intervene in exception.

## Regression
Every bug becomes a regression test.

## Release gates
- typecheck
- lint
- unit tests
- integration tests
- E2E critical path
- migration validation
- security/RLS tests
- production build verification
