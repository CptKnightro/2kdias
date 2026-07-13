import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — G.O.A.T / 2K Championship ring split.
 *
 * League matches and trophies each get a `ring` discriminator
 * ('goat' | '2k', default 'goat'). Existing rows are filled with 'goat'
 * (all matches logged so far belong to the G.O.A.T Ring); code treats a
 * missing ring the same way. Guarded, safe to (re)run — delta style like
 * the other migrations (no full baseline).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_matches_ring') THEN
        CREATE TYPE "public"."enum_matches_ring" AS ENUM('goat', '2k');
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trophies_ring') THEN
        CREATE TYPE "public"."enum_trophies_ring" AS ENUM('goat', '2k');
      END IF;
    END $$;

    ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "ring" "enum_matches_ring" DEFAULT 'goat';
    ALTER TABLE "trophies" ADD COLUMN IF NOT EXISTS "ring" "enum_trophies_ring" DEFAULT 'goat';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "matches" DROP COLUMN IF EXISTS "ring";
    ALTER TABLE "trophies" DROP COLUMN IF EXISTS "ring";
    DROP TYPE IF EXISTS "public"."enum_matches_ring";
    DROP TYPE IF EXISTS "public"."enum_trophies_ring";
  `)
}
