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

export const tiktokAutomationConfig = pgTable('tiktok_automation_config', {
  key: text('key').primaryKey(),
  channelUrl: text('channel_url')
    .notNull()
    .default('https://www.tiktok.com/@superboda0'),
  channelHandle: text('channel_handle').notNull().default('@superboda0'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  timezone: text('timezone').notNull().default('Africa/Cairo'),
  scheduleSlotsJson: text('schedule_slots_json')
    .notNull()
    .default(
      '["01:00","07:00","09:00","11:00","14:00","16:00","18:00","20:00","22:00","23:00"]'
    ),
  ayahsPerReel: integer('ayahs_per_reel').notNull().default(10),
  currentSurahId: integer('current_surah_id').notNull().default(1),
  currentFromAyah: integer('current_from_ayah').notNull().default(1),
  khatmahCycle: integer('khatmah_cycle').notNull().default(1),
  isAigcEnabled: boolean('is_aigc_enabled').notNull().default(true),
  privacyLevel: text('privacy_level').notNull().default('PUBLIC_TO_EVERYONE'),
  postMode: text('post_mode').notNull().default('DIRECT_POST'),
  hashtags: text('hashtags')
    .notNull()
    .default(
      '#قرأن #قرأن_كريم_راحة_نفسية #قرأن_كريم #قرأني_جناتي #قرأن_كريم_بصوت_جميل #اسلاميات #دينى_حياتى #راحة_نفسية #راحة_نفسية_للقلب🤲📿💕'
    ),
  totalPublishedCount: integer('total_published_count').notNull().default(0),
  lastPublishedAt: timestamp('last_published_at'),
  lastError: text('last_error'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tiktokOauthTokens = pgTable('tiktok_oauth_tokens', {
  key: text('key').primaryKey(),
  openId: text('open_id').notNull(),
  username: text('username'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  scope: text('scope').notNull().default(''),
  expiresAt: timestamp('expires_at').notNull(),
  refreshExpiresAt: timestamp('refresh_expires_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tiktokPublishLogs = pgTable('tiktok_publish_logs', {
  id: serial('id').primaryKey(),
  slotKey: text('slot_key').notNull(),
  scheduledTimeLabel: text('scheduled_time_label').notNull(),
  khatmahCycle: integer('khatmah_cycle').notNull().default(1),
  surahId: integer('surah_id').notNull(),
  surahNameArabic: text('surah_name_arabic').notNull(),
  fromAyah: integer('from_ayah').notNull(),
  toAyah: integer('to_ayah').notNull(),
  reciterId: text('reciter_id').notNull(),
  reciterNameArabic: text('reciter_name_arabic').notNull(),
  caption: text('caption').notNull(),
  isAigc: boolean('is_aigc').notNull().default(true),
  status: text('status').notNull(),
  tiktokPublishId: text('tiktok_publish_id'),
  videoDurationSec: integer('video_duration_sec'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
