import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — adds the `matches.walkover` flag.
 *
 * Hand-written (the schema was originally created via Payload dev "push", so
 * there is no full baseline). Guarded with IF NOT EXISTS so it is safe to rerun.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "walkover" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "matches" DROP COLUMN IF EXISTS "walkover";
  `)
}
