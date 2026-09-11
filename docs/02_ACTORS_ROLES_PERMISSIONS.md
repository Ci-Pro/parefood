# Actors, Roles & Permissions

## Roles
- customer
- merchant_owner
- merchant_staff
- driver
- admin_operations
- admin_finance
- admin_support
- super_admin

## Principle
Use least privilege. Role alone is insufficient; resource ownership and server-side authorization must also be checked.

## Customer
Own profile, addresses, carts, orders, reviews, notifications.

## Merchant
Only own merchant/store/catalog/orders/earnings.

## Driver
Only own profile/documents, assigned deliveries, own earnings and delivery history.

## Operations
Orders, merchants, drivers, dispatch, service areas, incidents.

## Finance
Payments, refunds, merchant settlements, driver earnings, financial reports.

## Support
Customer/merchant/driver support and incident workflows.

## Super Admin
System configuration, role management, security and emergency administration.
