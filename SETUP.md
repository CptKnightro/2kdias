# 2KDais — Setup Guide

Step-by-step, assuming you've never used Supabase. ~15 minutes.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. Name it `2kdais`, pick a region near you, and **set a database password** (save it — you'll need it).
3. Wait ~2 min for it to provision.

## 2. Get your connection strings

Supabase Dashboard → **Project Settings → Database → Connection string**.

You need **two**:

| Env var | Which tab | Port | Used for |
|---|---|---|---|
| `DATABASE_URI` | **Transaction pooler** | `6543` | App runtime (works on Vercel serverless) |
| `DATABASE_URI_DIRECT` | **Direct connection** / Session | `5432` | Running migrations |

Copy each, replacing `[YOUR-PASSWORD]` with the DB password from step 1. Append `?sslmode=require` if not present.

> The pooler (6543) is essential for Vercel — serverless functions open many short connections and would exhaust a direct connection.

## 3. Get your API keys

Supabase Dashboard → **Project Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (secret — never expose client-side)

## 4. Get your Storage (S3) keys

Supabase Dashboard → **Project Settings → Storage → S3 Connection**:
- Click **New access key** → copy the **Access key ID** → `S3_ACCESS_KEY_ID`
- and **Secret access key** → `S3_SECRET_ACCESS_KEY`
- The **Endpoint** shown (e.g. `https://<ref>.storage.supabase.co/storage/v1/s3`) → `S3_ENDPOINT`
- **Region** (e.g. `us-east-1`) → `S3_REGION`

Then create the bucket: Dashboard → **Storage → New bucket** → name it `media`, mark it **Public**.

## 5. Fill in `.env`

Open `.env` (already created with a `PAYLOAD_SECRET`) and paste all the values from steps 2–4.

## 6. Create the database schema

```bash
# point migrations at the DIRECT connection
npm run migrate:create        # generates the initial SQL migration
DATABASE_URI="$DATABASE_URI_DIRECT" npm run migrate   # applies it
```

> Tip: for the very first run you can instead just `npm run dev` once — Payload's dev mode
> auto-pushes the schema. For Vercel/production, always use migrations.

## 7. Seed the player pool + commissioner

```bash
npm run seed
```

This imports all 389 players from `data/2kplayerlist.csv` (auto-assigning rarity tiers) and creates a
commissioner login:

```
email:    commissioner@2kdais.local
password: changeme123
```

Override with `SEED_COMMISSIONER_EMAIL` / `SEED_COMMISSIONER_PASSWORD` in `.env`. **Change the password** at `/admin` after first login.

## 8. Enable Realtime for the live auction

Supabase Dashboard → **SQL Editor** → paste and run [`supabase/realtime.sql`](supabase/realtime.sql).
This adds the `bids` and `auctions` tables to the realtime publication and adds read-only RLS policies
so browsers can subscribe to live bid events. (All writes still go through Payload — the browser only reads.)

## 9. Run it

```bash
npm run dev
```

- App: <http://localhost:3000>
- Commissioner panel: <http://localhost:3000/admin>

### First-run checklist
1. Log in at `/admin`, change your password.
2. **Franchises** → create one team per friend; set each `purseTotal`; assign a `color`.
3. **Users** → create an owner account per friend, set role `owner`, link their `franchise`.
4. **League Settings** → set your **currency name/symbol** and squad cap.
5. **Auctions** → create an auction, drag players into its **queue**, set status... then open `/auction`
   and run it live: pick a player → owners bid → *Going once/twice* → *Sell*.

---

## Deploying to Vercel

1. Push the repo to GitHub, then **Import** it at <https://vercel.com/new>.
2. Add **all** the `.env` vars in Vercel → Project → Settings → Environment Variables (Production + Preview).
3. Set the build to run migrations first:
   - Override **Build Command**: `npm run migrate && npm run build`
   - (Vercel sets `DATABASE_URI` from your env; ensure migrations can reach it — or run `npm run migrate` locally against the direct connection before deploying.)
4. Deploy. Payload runs on Fluid Compute serverless functions; media is on Supabase Storage; realtime works over the Supabase websocket.
