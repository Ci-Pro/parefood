# Risk Register

## Highest risks
1. Order state inconsistencies
2. Financial calculation errors
3. Payment webhook duplication
4. Driver assignment failures
5. RLS misconfiguration
6. Location/provider dependency
7. Poor low-end device performance
8. Scope expansion
9. Operational support overload
10. Incomplete audit trail

## Mitigation
Use state machines, transactions, idempotency, immutable snapshots, RLS tests, provider abstractions, performance budgets, staged rollout and operational dashboards.
