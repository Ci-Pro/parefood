# Database Blueprint

## Core domains
### Identity
profiles, roles, user_roles

### Merchant
merchants, merchant_staff, merchant_hours, merchant_categories

### Catalog
menu_categories, menu_items, menu_variants, menu_addons, menu_item_addons

### Customer
customer_profiles, customer_addresses, carts, cart_items

### Orders
orders, order_items, order_item_options, order_status_history

### Delivery
drivers, driver_documents, deliveries, driver_locations, delivery_events, driver_assignments

### Finance
payments, payment_events, refunds, merchant_earnings, driver_earnings, platform_earnings, settlements

### Promotion
promotions, promotion_rules, promotion_redemptions

### Engagement
reviews, notifications, support_tickets, support_messages

### Operations
service_areas, delivery_zones, pricing_rules, app_settings, audit_logs

## Database principles
- UUID primary keys
- created_at/updated_at
- soft deletion only where business-appropriate
- foreign keys
- check constraints
- unique constraints
- indexes on status, ownership and timestamps
- transactional functions for critical mutations
- migration-first
- RLS on exposed tables
- no secret provider keys in client apps

## Required order snapshots
Persist purchased item name, unit price, option names/prices and relevant fee/discount calculations so historical orders remain correct.
