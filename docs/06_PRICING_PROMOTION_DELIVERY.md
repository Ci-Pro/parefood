# Pricing, Promotion & Delivery Engines

## Pricing Engine
Inputs:
- item prices
- variants
- addons
- quantity
- delivery zone
- promotion
- service fee configuration
- tax configuration
- adjustment rules

Outputs:
- subtotal
- discount
- delivery_fee
- service_fee
- tax
- grand_total

All calculations must be reproducible and persisted as order pricing snapshots.

## Promotion Engine
MVP supports:
- fixed discount
- percentage discount
- minimum order
- maximum discount
- merchant-specific voucher
- platform voucher
- usage limit
- per-customer limit
- validity period
- active/inactive

Validation must be server-side.

## Delivery Engine
- Service areas/zones
- minimum/maximum order distance rules
- configurable base fee
- distance-based fee
- merchant/customer zone eligibility
- driver availability
- assignment state
- cancellation/reassignment

Provider-specific map logic must stay behind a LocationService interface.
