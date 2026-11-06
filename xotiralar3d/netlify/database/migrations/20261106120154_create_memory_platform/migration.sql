CREATE TABLE "audit" (
	"id" text PRIMARY KEY,
	"by" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" text PRIMARY KEY,
	"h" text NOT NULL,
	"uid" text NOT NULL,
	"text" text NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "houses" (
	"id" text PRIMARY KEY,
	"owner" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"rooms" jsonb NOT NULL,
	"song" text,
	"visits" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" text PRIMARY KEY,
	"t" text NOT NULL,
	"b" text NOT NULL,
	"img" text NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY,
	"uid" text NOT NULL,
	"text" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"last_seen" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"uid" text NOT NULL,
	"text" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" text PRIMARY KEY,
	"t" text NOT NULL,
	"a" text NOT NULL,
	"url" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"uid" text NOT NULL,
	CONSTRAINT "votes_kind_target_uid_unique" UNIQUE("kind","target","uid")
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" text PRIMARY KEY,
	"uid" text NOT NULL,
	"text" text NOT NULL,
	"at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_h_houses_id_fkey" FOREIGN KEY ("h") REFERENCES "houses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_uid_profiles_id_fkey" FOREIGN KEY ("uid") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "houses" ADD CONSTRAINT "houses_owner_profiles_id_fkey" FOREIGN KEY ("owner") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_uid_profiles_id_fkey" FOREIGN KEY ("uid") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_uid_profiles_id_fkey" FOREIGN KEY ("uid") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_uid_profiles_id_fkey" FOREIGN KEY ("uid") REFERENCES "profiles"("id");--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_uid_profiles_id_fkey" FOREIGN KEY ("uid") REFERENCES "profiles"("id");