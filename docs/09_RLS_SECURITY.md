# RLS & Security Model

## Security layers
1. Supabase Auth
2. JWT claims/session
3. PostgreSQL RLS
4. Server-side Edge Functions
5. Audit logging
6. Provider secret isolation

## RLS principles
Customer: own resources.
Merchant: own merchant resources.
Driver: own resources and assigned delivery resources.
Admin: scoped operational permissions.

## Critical operations
Use Edge Functions or secure database functions for:
- create order
- payment confirmation
- webhook processing
- merchant accept/reject
- driver assignment
- cancellation
- refund
- settlement
- financial adjustments

## Security requirements
- Never expose service role key.
- Validate all uploaded documents.
- Rate limit sensitive actions.
- Verify webhook signatures.
- Log privileged operations.
- Use least privilege.
