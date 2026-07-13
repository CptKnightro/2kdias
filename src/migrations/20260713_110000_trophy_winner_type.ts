import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — trophy winner types + pickable trophy icons.
 *
 * A trophy can now be won by a team OR an individual owner: adds `winner_type`
 * ('team' | 'owner') and `owner_name` to `trophies_winners`, and relaxes
 * `franchise_id` to nullable (owner-type winners have no franchise). Also adds
 * `icon` on `trophies` (trophy/ring/crown/cup/plate — the commissioner picks
 * it by clicking the icon on the trophy card). Guarded, safe to (re)run.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trophies_winners_winner_type') THEN
        CREATE TYPE "public"."enum_trophies_winners_winner_type" AS ENUM('team', 'owner');
      END IF;
    END $$;

    ALTER TABLE "trophies_winners" ADD COLUMN IF NOT EXISTS "winner_type" "enum_trophies_winners_winner_type" DEFAULT 'team';
    ALTER TABLE "trophies_winners" ADD COLUMN IF NOT EXISTS "owner_name" varchar;
    ALTER TABLE "trophies_winners" ALTER COLUMN "franchise_id" DROP NOT NULL;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trophies_icon') THEN
        CREATE TYPE "public"."enum_trophies_icon" AS ENUM('trophy', 'ring', 'crown', 'cup', 'plate');
      END IF;
    END $$;

    ALTER TABLE "trophies" ADD COLUMN IF NOT EXISTS "icon" "enum_trophies_icon";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "trophies_winners" WHERE "franchise_id" IS NULL;
    ALTER TABLE "trophies_winners" ALTER COLUMN "franchise_id" SET NOT NULL;
    ALTER TABLE "trophies_winners" DROP COLUMN IF EXISTS "winner_type";
    ALTER TABLE "trophies_winners" DROP COLUMN IF EXISTS "owner_name";
    DROP TYPE IF EXISTS "public"."enum_trophies_winners_winner_type";
    ALTER TABLE "trophies" DROP COLUMN IF EXISTS "icon";
    DROP TYPE IF EXISTS "public"."enum_trophies_icon";
  `)
}
