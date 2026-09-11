# CI/CD & Environments

## Environments
Development
Staging
Production

Each environment has isolated Supabase configuration and credentials.

## Mobile
EAS builds:
- customer
- merchant
- driver
- admin-mobile

## Web
admin-web → Vercel.

## CI
Pull request:
- install
- lint
- typecheck
- tests
- build affected apps

Main:
- staging deployment/build.

Production:
- controlled release with approval.
