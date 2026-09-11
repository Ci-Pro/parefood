# Monorepo Architecture

## Repository
parefood/

## Apps
apps/customer
apps/merchant
apps/driver
apps/admin-mobile
apps/admin-web

## Packages
packages/ui
packages/design-system
packages/types
packages/api
packages/auth
packages/validation
packages/config
packages/constants
packages/utils
packages/localization
packages/eslint-config
packages/tsconfig

## Backend
supabase/migrations
supabase/functions
supabase/seed
supabase/config.toml

## Documentation
docs/product
docs/architecture
docs/database
docs/business-rules
docs/api
docs/ux
docs/testing
docs/operations

## Tooling
pnpm + Turborepo.

## Boundary rule
Apps own screens and role-specific flows.
Packages own reusable infrastructure and components.
