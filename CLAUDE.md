# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use `bun` as the package manager (bun.lock is present):

```bash
bun run dev          # Start dev server on port 8080
bun run build        # Production build
bun run lint         # ESLint
bun run test         # Run Vitest (single pass)
bun run test:watch   # Vitest in watch mode
bun run preview      # Preview production build
```

## Architecture

This is a React 18 + TypeScript + Vite application for managing a church altar restoration campaign (*Restauración del Retablo de Ircio*). Backend is entirely Supabase (PostgreSQL + Auth + Edge Functions). Payments go through Stripe; transactional emails through Resend.

**Frontend data flow:**
- `src/integrations/supabase/client.ts` — single Supabase client instance used everywhere
- `src/hooks/useAuth.ts` — manages Supabase Auth session and checks admin role via `user_roles` table
- TanStack React Query handles all server state (fetching, caching, mutations)
- React Hook Form + Zod for form validation

**Routing (`src/App.tsx`):**
- Public pages: `/`, `/shop`, `/finances`, `/events`, `/auth`
- Admin pages (`/admin`, `/admin/finances`, `/admin/shop`) are wrapped in `ProtectedRoute`, which checks the `isAdmin` flag from `useAuth`

**Supabase Edge Functions (`supabase/functions/`):**
- `create-checkout` — creates a Stripe checkout session
- `stripe-webhook` — handles post-payment: inserts into `orders`, sends admin + customer emails
- `send-order-notification` — email dispatch helper

**Internationalization:** i18next with Spanish (default), English, and Euskera. Translation JSON files live in `src/i18n/`. Language is auto-detected from browser and switchable via `LanguageSwitcher` in the header.

**UI components:** shadcn/ui (Radix UI base + Tailwind). All generated components are in `src/components/ui/`. Custom theming via CSS variables in `src/index.css`. Icons from `lucide-react`.

## Environment Variables

The `.env` file contains public Supabase keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) and is committed. Edge Function secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) must be set in the Supabase dashboard — they are never in the repo.

## Database

RLS is enabled on all tables. Admin access is gated by a `has_role()` PostgreSQL function that checks the `user_roles` table. Key tables: `donations`, `expenses`, `products`, `orders`, `events`, `event_registrations`, `campaign_settings`, `shop_settings`.

TypeScript DB types are generated at `src/integrations/supabase/types.ts` — regenerate with the Supabase MCP tool (`generate_typescript_types`) after schema changes.

## Stripe Webhook

The webhook handler uses `await stripe.webhooks.constructEventAsync()` (not the synchronous `constructEvent`) because Edge Functions run in a Deno/Web Crypto environment where the synchronous API is unavailable.
