# Business Rules

## General
- Server is authoritative for money and state transitions.
- Client cannot set final totals.
- Client cannot arbitrarily change order status.
- Historical financial records are immutable; corrections use adjustment records.

## Order
- An order belongs to one merchant.
- Order items snapshot name, price and selected options at purchase time.
- Menu price changes do not alter existing orders.
- Cancellation depends on current state and configured rules.
- Merchant rejection triggers the configured refund flow.

## Pricing
Order total is derived from:
items subtotal + addons/variants + delivery fee + service fee + tax (if enabled) - discounts + adjustments.

## Delivery
- Delivery eligibility is determined by service area/zone.
- Fee is calculated server-side.
- Driver assignment must be auditable.
- Pickup and delivery timestamps are recorded.

## Payment
Payment status is independent from order status.
Webhook events are idempotent.
No order is considered financially paid solely because the client says so.

## Earnings
Merchant earnings, driver earnings and platform revenue are separate ledger concepts.
Settlement status is separate from earned amount.

## Reviews
Only eligible completed orders can be reviewed.
One review per eligible order unless an explicit correction workflow exists.

## Audit
Critical changes create audit records.
