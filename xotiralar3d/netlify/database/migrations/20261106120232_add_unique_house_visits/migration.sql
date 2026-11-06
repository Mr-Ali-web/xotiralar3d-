CREATE TABLE "visits" (
	"id" text PRIMARY KEY,
	"h" text NOT NULL,
	"uid" text NOT NULL,
	CONSTRAINT "visits_h_uid_unique" UNIQUE("h","uid")
);
--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_h_houses_id_fkey" FOREIGN KEY ("h") REFERENCES "houses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_uid_profiles_id_fkey" FOREIGN KEY ("uid") REFERENCES "profiles"("id");