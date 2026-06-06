# CLAUDE.md — 2KDais

> Check `/Users/Mandy/Developer/Second Brain/Projects/2KDais.md` first — curated project knowledge lives there.

## What this is

A CMS for our **NBA 2K couch co-op league**. Friends are **franchise owners** who built teams
via a budget **auction** over a pool of NBA players, then play each other in **tournaments**.
Three pillars: **Auction → Trades → Tournaments**.

## Stack

- **Payload CMS 3.85** (Next-native) + **Next.js 16** App Router — one app; admin at `/admin`, REST/GraphQL at `/api`.
- **Supabase Postgres** via `@payloadcms/db-postgres` (integer IDs).
- **Supabase Realtime** on the `bids`/`auctions` tables for the live auction.
- **Supabase Storage** (S3-compatible) via `@payloadcms/storage-s3` for media.
- **Tailwind v4 + shadcn/ui** (new-york), **Phosphor Bold** icons, **next-themes**.
- Deploys to **Vercel**.

## Design language

- Accent red `#DF2604`; light = white, dark = pitch black (`next-themes`, default dark).
- **Skeuomorphism + frosted glass**. Utilities in [globals.css](src/app/(frontend)/globals.css):
  `.glass`, `.glass-strong`, `.skeuo`, `.skeuo-btn`, `.skeuo-inset`, `.foil`, `.tier-*`.
- Fonts: **Saira Condensed** (display) + **Inter** (body).
- Player cards = 2K MyTeam style; rarity tier derived from OVR — see [rarity.ts](src/lib/rarity.ts).

## Data model (Payload)

Collections: `users` (auth; roles commissioner/owner), `franchises`, `players`, `auctions`, `bids`,
`trades`, `tournaments`, `matches`, `awards`, `activity`, `media`. Global: `league-settings`
(currency name/symbol — the league uses a **custom currency**, no `$`; **no position quotas**, only a squad-size cap).

Key logic:
- [Players.ts](src/collections/Players.ts) `beforeChange` derives `rarityTier` + base price from OVR.
- [Bids.ts](src/collections/Bids.ts) `beforeValidate` enforces purse / increment / squad cap and pins the bid to the live lot; `afterChange` advances the auction's high bid (this is what realtime broadcasts).
- Auction actions (bid + auctioneer controls) in [auction/actions.ts](src/app/(frontend)/auction/actions.ts).

## Conventions

- Server Components read via `safeQuery()` in [payload.ts](src/lib/payload.ts) — returns `dbReady:false` instead of throwing, so pages render a "connect your database" state before Supabase is wired.
- All list pages are `export const dynamic = 'force-dynamic'`.
- IDs are **numbers** (Postgres serial) — coerce string IDs from the client with `Number()` before passing to Payload.

## Commands

```bash
npm run dev                 # Next + Payload dev
npm run generate:types      # regenerate src/payload-types.ts after schema changes
npm run migrate:create      # create a SQL migration (run against DATABASE_URI_DIRECT)
npm run migrate             # apply migrations
npm run seed                # import data/2kplayerlist.csv (389 players) + bootstrap commissioner
npm run seed -- --force     # wipe + reimport players
```

## Supabase setup (see SETUP.md for the full walkthrough)

`.env` needs: `PAYLOAD_SECRET`, `DATABASE_URI` (pooler :6543), `DATABASE_URI_DIRECT` (:5432),
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`S3_*` (Storage). Realtime: add `bids` + `auctions` to the `supabase_realtime` publication and add
RLS read policies (see SETUP.md). Runtime uses the **pooler**; migrations use the **direct** connection.

## Gotchas

- Payload's `create-payload-app` CLI needs a TTY (fails in headless shells) — this repo was bootstrapped via `degit` of the blank template, then deps were pinned to published versions (the template ships `workspace:*`).
- `disableLocalStorage: true` on `media` — uploads require the S3 (Supabase Storage) env to be set, else they fail (app still boots).
