import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { lineStringGeometry, pointGeometry } from './postgis';

export const pois = pgTable('pois', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  location: pointGeometry('location').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const poiImages = pgTable('poi_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  poiId: uuid('poi_id')
    .notNull()
    .references(() => pois.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const poiJournalEntries = pgTable('poi_journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  poiId: uuid('poi_id')
    .notNull()
    .references(() => pois.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roadSegments = pgTable('road_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  path: lineStringGeometry('path').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roadSegmentImages = pgTable('road_segment_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  roadSegmentId: uuid('road_segment_id')
    .notNull()
    .references(() => roadSegments.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const roadSegmentJournalEntries = pgTable('road_segment_journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  roadSegmentId: uuid('road_segment_id')
    .notNull()
    .references(() => roadSegments.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Poi = typeof pois.$inferSelect;
export type NewPoi = typeof pois.$inferInsert;
export type PoiImage = typeof poiImages.$inferSelect;
export type NewPoiImage = typeof poiImages.$inferInsert;
export type RoadSegment = typeof roadSegments.$inferSelect;
export type NewRoadSegment = typeof roadSegments.$inferInsert;
export type RoadSegmentImage = typeof roadSegmentImages.$inferSelect;
export type NewRoadSegmentImage = typeof roadSegmentImages.$inferInsert;
export type PoiJournalEntry = typeof poiJournalEntries.$inferSelect;
export type NewPoiJournalEntry = typeof poiJournalEntries.$inferInsert;
export type RoadSegmentJournalEntry =
  typeof roadSegmentJournalEntries.$inferSelect;
export type NewRoadSegmentJournalEntry =
  typeof roadSegmentJournalEntries.$inferInsert;
