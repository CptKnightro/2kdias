import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — adds the main/mid auction + retention fields.
 *
 * The DB schema for this project was originally created with Payload's dev
 * "push", so there is no full baseline migration. Payload's auto-generated file
 * tried to re-CREATE every type/table (which would collide with the live
 * schema), so this migration is hand-written to add ONLY the new columns. Every
 * statement is guarded (IF NOT EXISTS / DO block) so it is safe to (re)run.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_auctions_kind') THEN
        CREATE TYPE "public"."enum_auctions_kind" AS ENUM('main', 'mid');
      END IF;
    END $$;

    ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "kind" "enum_auctions_kind" DEFAULT 'mid';
    ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "retention_open" boolean DEFAULT false;
    ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "retention_limit" numeric DEFAULT 3;
    ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "retention_deadline" timestamp(3) with time zone;
    ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "retained" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "auctions" DROP COLUMN IF EXISTS "kind";
    ALTER TABLE "auctions" DROP COLUMN IF EXISTS "retention_open";
    ALTER TABLE "auctions" DROP COLUMN IF EXISTS "retention_limit";
    ALTER TABLE "auctions" DROP COLUMN IF EXISTS "retention_deadline";
    ALTER TABLE "players" DROP COLUMN IF EXISTS "retained";
    DROP TYPE IF EXISTS "public"."enum_auctions_kind";
  `)
}
