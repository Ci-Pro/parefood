# AI Agent Engineering Rules

## Golden rule
Do not invent requirements. If a rule is unclear, inspect the source-of-truth documents before coding.

## Source of truth priority
1. Business rules
2. PRD
3. Database blueprint
4. API contract
5. UX architecture
6. Existing code/tests
7. Agent assumptions — lowest priority

## Before implementation
- identify affected modules
- inspect existing code
- inspect migrations
- inspect types/contracts
- identify dependencies
- state acceptance criteria

## During implementation
- small coherent changes
- no unrelated refactors
- no mock production logic
- no placeholder APIs
- preserve role boundaries
- add tests for business-critical logic

## After implementation
- typecheck
- lint
- tests
- review migration/RLS
- update docs if behavior changed
- report files changed and remaining risks

## Forbidden
- changing business rules silently
- bypassing RLS
- putting secrets in mobile/web code
- client-controlled financial totals
- arbitrary status updates
- fake payment success
- fake driver locations in production
