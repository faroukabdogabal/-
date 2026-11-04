import { desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  tiktokAutomationConfig,
  tiktokOauthTokens,
  tiktokPublishLogs,
} from './schema.ts';
import {
  FIXED_DAILY_SLOTS_24H,
  OFFICIAL_TIKTOK_CHANNEL_URL,
  OFFICIAL_TIKTOK_HANDLE,
  OFFICIAL_TIKTOK_HASHTAGS,
} from '../utils/tiktokKhatmahPlanner.ts';

const CONFIG_SINGLETON_KEY = 'superboda0_main';
const TOKEN_SINGLETON_KEY = 'superboda0_oauth';

export async function getOrInitTikTokConfig() {
  const existing = await db
    .select()
    .from(tiktokAutomationConfig)
    .where(eq(tiktokAutomationConfig.key, CONFIG_SINGLETON_KEY))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const inserted = await db
    .insert(tiktokAutomationConfig)
    .values({
      key: CONFIG_SINGLETON_KEY,
      channelUrl: OFFICIAL_TIKTOK_CHANNEL_URL,
      channelHandle: OFFICIAL_TIKTOK_HANDLE,
      isEnabled: true,
      timezone: 'Africa/Cairo',
      scheduleSlotsJson: JSON.stringify(FIXED_DAILY_SLOTS_24H),
      ayahsPerReel: 10,
      currentSurahId: 1,
      currentFromAyah: 1,
      khatmahCycle: 1,
      isAigcEnabled: true,
      privacyLevel: 'PUBLIC_TO_EVERYONE',
      postMode: 'DIRECT_POST',
      hashtags: OFFICIAL_TIKTOK_HASHTAGS,
      totalPublishedCount: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) {
    return inserted[0];
  }

  const refetched = await db
    .select()
    .from(tiktokAutomationConfig)
    .where(eq(tiktokAutomationConfig.key, CONFIG_SINGLETON_KEY))
    .limit(1);

  return refetched[0];
}

export interface UpdateTikTokConfigPatch {
  isEnabled?: boolean;
  timezone?: string;
  currentSurahId?: number;
  currentFromAyah?: number;
  khatmahCycle?: number;
  ayahsPerReel?: number;
  isAigcEnabled?: boolean;
  privacyLevel?: string;
  postMode?: string;
  hashtags?: string;
  lastError?: string | null;
}

export async function updateTikTokConfig(patch: UpdateTikTokConfigPatch) {
  await getOrInitTikTokConfig();

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof patch.isEnabled === 'boolean') {
    updateValues.isEnabled = patch.isEnabled;
  }
  if (typeof patch.timezone === 'string' && patch.timezone.trim()) {
    updateValues.timezone = patch.timezone.trim();
  }
  if (typeof patch.currentSurahId === 'number') {
    updateValues.currentSurahId = Math.max(
      1,
      Math.min(114, Math.floor(patch.currentSurahId))
    );
  }
  if (typeof patch.currentFromAyah === 'number') {
    updateValues.currentFromAyah = Math.max(
      1,
      Math.min(286, Math.floor(patch.currentFromAyah))
    );
  }
  if (typeof patch.khatmahCycle === 'number') {
    updateValues.khatmahCycle = Math.max(1, Math.floor(patch.khatmahCycle));
  }
  if (typeof patch.ayahsPerReel === 'number') {
    updateValues.ayahsPerReel = Math.max(
      1,
      Math.min(10, Math.floor(patch.ayahsPerReel))
    );
  }
  if (typeof patch.isAigcEnabled === 'boolean') {
    updateValues.isAigcEnabled = patch.isAigcEnabled;
  }
  if (typeof patch.privacyLevel === 'string' && patch.privacyLevel.trim()) {
    updateValues.privacyLevel = patch.privacyLevel.trim();
  }
  if (typeof patch.postMode === 'string' && patch.postMode.trim()) {
    updateValues.postMode = patch.postMode.trim();
  }
  if (typeof patch.hashtags === 'string' && patch.hashtags.trim()) {
    updateValues.hashtags = patch.hashtags.trim();
  }
  if (patch.lastError !== undefined) {
    updateValues.lastError = patch.lastError;
  }

  const rows = await db
    .update(tiktokAutomationConfig)
    .set(updateValues)
    .where(eq(tiktokAutomationConfig.key, CONFIG_SINGLETON_KEY))
    .returning();

  return rows[0];
}

export async function advanceTikTokKhatmahCursor(next: {
  surahId: number;
  fromAyah: number;
  khatmahCycle: number;
}) {
  const current = await getOrInitTikTokConfig();
  const rows = await db
    .update(tiktokAutomationConfig)
    .set({
      currentSurahId: next.surahId,
      currentFromAyah: next.fromAyah,
      khatmahCycle: next.khatmahCycle,
      totalPublishedCount: (current?.totalPublishedCount || 0) + 1,
      lastPublishedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(tiktokAutomationConfig.key, CONFIG_SINGLETON_KEY))
    .returning();

  return rows[0];
}

export async function recordTikTokConfigError(errorMsg: string) {
  await getOrInitTikTokConfig();
  await db
    .update(tiktokAutomationConfig)
    .set({
      lastError: errorMsg.slice(0, 600),
      updatedAt: new Date(),
    })
    .where(eq(tiktokAutomationConfig.key, CONFIG_SINGLETON_KEY));
}

export async function getTikTokOAuthToken() {
  const rows = await db
    .select()
    .from(tiktokOauthTokens)
    .where(eq(tiktokOauthTokens.key, TOKEN_SINGLETON_KEY))
    .limit(1);

  return rows[0] || null;
}

export interface UpsertTikTokTokenInput {
  openId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export async function upsertTikTokOAuthToken(input: UpsertTikTokTokenInput) {
  const values = {
    key: TOKEN_SINGLETON_KEY,
    openId: input.openId,
    username: input.username ?? null,
    displayName: input.displayName ?? null,
    avatarUrl: input.avatarUrl ?? null,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    scope: input.scope,
    expiresAt: input.expiresAt,
    refreshExpiresAt: input.refreshExpiresAt,
    updatedAt: new Date(),
  };

  const rows = await db
    .insert(tiktokOauthTokens)
    .values(values)
    .onConflictDoUpdate({
      target: tiktokOauthTokens.key,
      set: {
        openId: values.openId,
        username: values.username,
        displayName: values.displayName,
        avatarUrl: values.avatarUrl,
        accessToken: values.accessToken,
        refreshToken: values.refreshToken,
        scope: values.scope,
        expiresAt: values.expiresAt,
        refreshExpiresAt: values.refreshExpiresAt,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  return rows[0];
}

export async function deleteTikTokOAuthToken() {
  await db
    .delete(tiktokOauthTokens)
    .where(eq(tiktokOauthTokens.key, TOKEN_SINGLETON_KEY));
}

export async function hasCompletedOrRunningSlot(slotKey: string): Promise<boolean> {
  const rows = await db
    .select({ id: tiktokPublishLogs.id, status: tiktokPublishLogs.status })
    .from(tiktokPublishLogs)
    .where(eq(tiktokPublishLogs.slotKey, slotKey))
    .limit(5);

  return rows.some((r) =>
    ['GENERATING', 'UPLOADING', 'PUBLISHED', 'INBOX_DRAFT'].includes(r.status)
  );
}

export interface CreatePublishLogInput {
  slotKey: string;
  scheduledTimeLabel: string;
  khatmahCycle: number;
  surahId: number;
  surahNameArabic: string;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  reciterNameArabic: string;
  caption: string;
  isAigc: boolean;
  status: string;
}

export async function createPublishLog(input: CreatePublishLogInput) {
  const rows = await db
    .insert(tiktokPublishLogs)
    .values({
      slotKey: input.slotKey,
      scheduledTimeLabel: input.scheduledTimeLabel,
      khatmahCycle: input.khatmahCycle,
      surahId: input.surahId,
      surahNameArabic: input.surahNameArabic,
      fromAyah: input.fromAyah,
      toAyah: input.toAyah,
      reciterId: input.reciterId,
      reciterNameArabic: input.reciterNameArabic,
      caption: input.caption,
      isAigc: input.isAigc,
      status: input.status,
    })
    .returning();

  return rows[0];
}

export async function updatePublishLog(
  id: number,
  patch: {
    status?: string;
    tiktokPublishId?: string | null;
    videoDurationSec?: number | null;
    errorMessage?: string | null;
  }
) {
  const values: Record<string, unknown> = {};
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.tiktokPublishId !== undefined)
    values.tiktokPublishId = patch.tiktokPublishId;
  if (patch.videoDurationSec !== undefined)
    values.videoDurationSec = patch.videoDurationSec;
  if (patch.errorMessage !== undefined) values.errorMessage = patch.errorMessage;

  const rows = await db
    .update(tiktokPublishLogs)
    .set(values)
    .where(eq(tiktokPublishLogs.id, id))
    .returning();

  return rows[0];
}

export async function cleanupStaleGeneratingLogs() {
  await db
    .update(tiktokPublishLogs)
    .set({
      status: 'FAILED',
      errorMessage: 'توقفت العملية السابقة بسبب إعادة تشغيل الخادم.',
    })
    .where(inArray(tiktokPublishLogs.status, ['GENERATING', 'UPLOADING']));
}

export async function listRecentPublishLogs(limit = 20) {
  return db
    .select()
    .from(tiktokPublishLogs)
    .orderBy(desc(tiktokPublishLogs.createdAt))
    .limit(Math.max(1, Math.min(50, limit)));
}
