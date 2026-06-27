import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — adds the loan window to trades.
 *
 * A trade is a temporary loan: once accepted the players move to the other team
 * for [`starts_at`, `ends_at`], then revert. Hand-written + guarded so it's safe
 * to rerun (see the other delta migrations for why there's no full baseline).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "starts_at" timestamp(3) with time zone;
    ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "ends_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "trades" DROP COLUMN IF EXISTS "starts_at";
    ALTER TABLE "trades" DROP COLUMN IF EXISTS "ends_at";
  `)
}
