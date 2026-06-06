-- 2KDais — enable Supabase Realtime for the live auction.
-- Run this in the Supabase SQL Editor AFTER the Payload schema exists
-- (i.e. after `npm run migrate` or the first `npm run dev`).
--
-- The browser subscribes (read-only, anon key) to bid inserts and auction-row
-- updates. All writes still go through Payload/server actions.

-- 1. Broadcast row changes on these tables.
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.auctions;

-- 2. Row Level Security: allow read (select) so realtime can deliver changes.
--    Writes are NOT granted here — they go through Payload (service role).
alter table public.bids enable row level security;
alter table public.auctions enable row level security;

drop policy if exists "realtime read bids" on public.bids;
create policy "realtime read bids"
  on public.bids for select
  to anon, authenticated
  using (true);

drop policy if exists "realtime read auctions" on public.auctions;
create policy "realtime read auctions"
  on public.auctions for select
  to anon, authenticated
  using (true);

-- Note: Payload connects as the postgres/service role, which bypasses RLS, so
-- the app's own reads/writes are unaffected by the policies above.
