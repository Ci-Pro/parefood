# Realtime & Notifications

## Realtime
Use Supabase Realtime for:
- order status
- merchant order queue
- driver assignment
- operational dashboards
- relevant delivery events

Do not expose unrelated records through broad realtime subscriptions.

## Push
Expo Notifications for mobile push.

## Notification types
- new order
- order accepted
- order rejected
- driver assigned
- driver near pickup
- order picked up
- driver near customer
- delivered
- payment result
- promotion
- support update

Notifications are event-driven and should be retryable/idempotent.
