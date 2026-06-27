import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — adds trade expiry.
 *
 * Hand-written (the schema was originally created via Payload dev "push", so
 * there is no full baseline). Adds:
 *   - the `expired` value to the trades-status enum
 *   - the `expires_at` deadline column on `trades`
 *
 * Every statement is guarded so it is safe to rerun. Postgres 12+ allows
 * `ADD VALUE` inside a transaction as long as the value isn't used in the same
 * transaction (it isn't here), so this is safe under Payload's migrate runner.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_trades_status" ADD VALUE IF NOT EXISTS 'expired';
    ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "expires_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Postgres can't drop a single enum value, so only the column is reversed.
  await db.execute(sql`
    ALTER TABLE "trades" DROP COLUMN IF EXISTS "expires_at";
  `)
}
