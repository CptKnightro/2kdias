import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Delta migration — adds the `trophies` collection (Trophies page).
 *
 * A trophy is either `recurring` (every ring holder is listed) or `final`
 * (a single winner holds it). Winners live in the `trophies_winners` array
 * table, each row pointing at a franchise. Hand-written + guarded so it's
 * safe to (re)run — see the other delta migrations for why there's no full
 * baseline.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_trophies_kind') THEN
        CREATE TYPE "public"."enum_trophies_kind" AS ENUM('recurring', 'final');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "trophies" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "kind" "enum_trophies_kind" DEFAULT 'recurring' NOT NULL,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "trophies_winners" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "franchise_id" integer NOT NULL,
      "season" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "trophies_winners" ADD CONSTRAINT "trophies_winners_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."trophies"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "trophies_winners" ADD CONSTRAINT "trophies_winners_franchise_id_franchises_id_fk"
        FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "trophies_updated_at_idx" ON "trophies" ("updated_at");
    CREATE INDEX IF NOT EXISTS "trophies_created_at_idx" ON "trophies" ("created_at");
    CREATE INDEX IF NOT EXISTS "trophies_winners_order_idx" ON "trophies_winners" ("_order");
    CREATE INDEX IF NOT EXISTS "trophies_winners_parent_id_idx" ON "trophies_winners" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "trophies_winners_franchise_idx" ON "trophies_winners" ("franchise_id");

    -- Payload's admin document-locking needs a rel column per collection.
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "trophies_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_trophies_fk"
        FOREIGN KEY ("trophies_id") REFERENCES "public"."trophies"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_trophies_id_idx"
      ON "payload_locked_documents_rels" ("trophies_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "trophies_id";
    DROP TABLE IF EXISTS "trophies_winners";
    DROP TABLE IF EXISTS "trophies";
    DROP TYPE IF EXISTS "public"."enum_trophies_kind";
  `)
}
