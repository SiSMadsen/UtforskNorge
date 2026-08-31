CREATE TABLE "poi_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poi_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "road_segment_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"road_segment_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poi_journal_entries" ADD CONSTRAINT "poi_journal_entries_poi_id_pois_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."pois"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_segment_journal_entries" ADD CONSTRAINT "road_segment_journal_entries_road_segment_id_road_segments_id_fk" FOREIGN KEY ("road_segment_id") REFERENCES "public"."road_segments"("id") ON DELETE cascade ON UPDATE no action;