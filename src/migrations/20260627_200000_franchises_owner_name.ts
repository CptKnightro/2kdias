import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — adds the `franchises.owner_name` display field.
 *
 * Hand-written (the schema was originally created via Payload dev "push", so
 * there is no full baseline). Guarded with IF NOT EXISTS so it is safe to rerun.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "franchises" ADD COLUMN IF NOT EXISTS "owner_name" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "franchises" DROP COLUMN IF EXISTS "owner_name";
  `)
}
