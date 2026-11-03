import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const savedReels = pgTable('saved_reels', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  titleArabic: text('title_arabic').notNull(),
  surahId: integer('surah_id').notNull(),
  fromAyah: integer('from_ayah').notNull(),
  toAyah: integer('to_ayah').notNull(),
  reciterId: text('reciter_id').notNull(),
  backgroundId: text('background_id').notNull(),
  translationId: text('translation_id').notNull(),
  aspectRatio: text('aspect_ratio').notNull(),
  sadaqahText: text('sadaqah_text').notNull().default(''),
  settingsJson: text('settings_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const platformMetrics = pgTable('platform_metrics', {
  key: text('key').primaryKey(),
  exportedVideosCount: integer('exported_videos_count').notNull().default(0),
  createdReelsCount: integer('created_reels_count').notNull().default(0),
  sharedSadaqahCount: integer('shared_sadaqah_count').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const publishedPresets = pgTable('published_presets', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleArabic: text('title_arabic').notNull(),
  subtitleArabic: text('subtitle_arabic').notNull(),
  surahId: integer('surah_id').notNull(),
  fromAyah: integer('from_ayah').notNull(),
  toAyah: integer('to_ayah').notNull(),
  reciterId: text('reciter_id').notNull(),
  backgroundId: text('background_id').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  ownerUid: text('owner_uid')
    .references(() => users.uid, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  savedReels: many(savedReels),
  publishedPresets: many(publishedPresets),
}));

export const savedReelsRelations = relations(savedReels, ({ one }) => ({
  user: one(users, {
    fields: [savedReels.userUid],
    references: [users.uid],
  }),
}));

export const publishedPresetsRelations = relations(publishedPresets, ({ one }) => ({
  owner: one(users, {
    fields: [publishedPresets.ownerUid],
    references: [users.uid],
  }),
}));
