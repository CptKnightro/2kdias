import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — timestamps each trophy ring (the history "log").
 *
 * Adds `awarded_at` to `trophies_winners`; rings awarded before this change
 * are backfilled from their trophy's creation date so the history modal has
 * a log entry for every ring. Guarded + idempotent (backfill only touches
 * NULL rows), safe to (re)run.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "trophies_winners" ADD COLUMN IF NOT EXISTS "awarded_at" timestamp(3) with time zone;

    UPDATE "trophies_winners" w
    SET "awarded_at" = t."created_at"
    FROM "trophies" t
    WHERE w."_parent_id" = t."id" AND w."awarded_at" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "trophies_winners" DROP COLUMN IF EXISTS "awarded_at";
  `)
}
