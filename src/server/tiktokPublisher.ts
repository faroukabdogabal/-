import crypto from 'crypto';
import {
  advanceTikTokKhatmahCursor,
  cleanupStaleGeneratingLogs,
  createPublishLog,
  getOrInitTikTokConfig,
  getTikTokOAuthToken,
  hasCompletedOrRunningSlot,
  recordTikTokConfigError,
  updatePublishLog,
  upsertTikTokOAuthToken,
} from '../db/tiktok.ts';
import {
  buildTikTokReelCaption,
  computeSequentialBatch,
  FIXED_DAILY_SLOTS_24H,
  formatSlotArabic,
  getZonedDateParts,
  OFFICIAL_TIKTOK_CHANNEL_URL,
  OFFICIAL_TIKTOK_DISPLAY,
  OFFICIAL_TIKTOK_HANDLE,
} from '../utils/tiktokKhatmahPlanner.ts';
import { generateSequentialKhatmahMp4 } from './tiktokVideoGenerator.ts';

const TIKTOK_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL =
  'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username';
const TIKTOK_CREATOR_INFO_URL =
  'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';
const TIKTOK_DIRECT_POST_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/video/init/';
const TIKTOK_INBOX_POST_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
const TIKTOK_PUBLISH_STATUS_URL =
  'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

interface PendingPkceSession {
  codeVerifier: string;
  redirectUri: string;
  createdAtMs: number;
}

const pkceSessions = new Map<string, PendingPkceSession>();

function cleanupExpiredPkceSessions() {
  const cutoff = Date.now() - 20 * 60 * 1000;
  for (const [state, session] of pkceSessions.entries()) {
    if (session.createdAtMs < cutoff) {
      pkceSessions.delete(state);
    }
  }
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function getTikTokCredentialsStatus(): {
  hasClientKey: boolean;
  hasClientSecret: boolean;
  isConfigured: boolean;
} {
  const key = (process.env.TIKTOK_CLIENT_KEY || '').trim();
  const secret = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
  const hasClientKey = Boolean(key && key !== 'YOUR_TIKTOK_CLIENT_KEY');
  const hasClientSecret = Boolean(secret && secret !== 'YOUR_TIKTOK_CLIENT_SECRET');
  return {
    hasClientKey,
    hasClientSecret,
    isConfigured: hasClientKey && hasClientSecret,
  };
}

export function resolveContainerBaseUrl(explicitOrigin?: string): string {
  if (explicitOrigin && explicitOrigin.startsWith('http')) {
    return explicitOrigin.replace(/\/$/, '');
  }
  const envUrl = (process.env.APP_URL || '').trim();
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }
  return 'https://ais-dev-bgrtkhykcmq7jqmzwd3k5q-467665018345.europe-west3.run.app';
}

export function createTikTokAuthorizationUrl(redirectUri: string): string {
  cleanupExpiredPkceSessions();

  const clientKey = (process.env.TIKTOK_CLIENT_KEY || '').trim();
  if (!clientKey || clientKey === 'YOUR_TIKTOK_CLIENT_KEY') {
    throw new Error(
      'يرجى إضافة TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET في إعدادات البيئة (Settings > Secrets) أولاً ثم المحاولة مجدداً.'
    );
  }

  const codeVerifier = base64UrlEncode(crypto.randomBytes(48));
  const codeChallenge = base64UrlEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
  const state = base64UrlEncode(crypto.randomBytes(24));

  pkceSessions.set(state, {
    codeVerifier,
    redirectUri,
    createdAtMs: Date.now(),
  });

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: 'user.info.basic,video.publish,video.upload',
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeTikTokOAuthCode(params: {
  code: string;
  state: string;
  fallbackRedirectUri: string;
}) {
  const clientKey = (process.env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
  if (!clientKey || !clientSecret) {
    throw new Error('مفاتيح TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET غير مُهيأة.');
  }

  const session = pkceSessions.get(params.state);
  pkceSessions.delete(params.state);

  const redirectUri = session?.redirectUri || params.fallbackRedirectUri;

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: params.code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  if (session?.codeVerifier) {
    body.set('code_verifier', session.codeVerifier);
  }

  const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: body.toString(),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    open_id?: string;
    scope?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token || !tokenJson.refresh_token) {
    throw new Error(
      tokenJson.error_description ||
        tokenJson.error ||
        `فشل تبديل رمز دخول تيك توك (HTTP ${tokenRes.status})`
    );
  }

  let username: string | null = OFFICIAL_TIKTOK_HANDLE.replace(/^@/, '');
  let displayName: string | null = OFFICIAL_TIKTOK_DISPLAY;
  let avatarUrl: string | null = null;

  try {
    const profileRes = await fetch(TIKTOK_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    });
    if (profileRes.ok) {
      const profileJson = (await profileRes.json()) as {
        data?: {
          user?: {
            username?: string;
            display_name?: string;
            avatar_url?: string;
          };
        };
      };
      const u = profileJson.data?.user;
      if (u?.username) username = u.username;
      if (u?.display_name) displayName = u.display_name;
      if (u?.avatar_url) avatarUrl = u.avatar_url;
    }
  } catch {
    // Non-fatal if basic user profile scope is restricted
  }

  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + (tokenJson.expires_in || 86400) * 1000);
  const refreshExpiresAt = new Date(
    nowMs + (tokenJson.refresh_expires_in || 30 * 86400) * 1000
  );

  return upsertTikTokOAuthToken({
    openId: tokenJson.open_id || 'tiktok_user',
    username,
    displayName,
    avatarUrl,
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    scope: tokenJson.scope || 'user.info.basic,video.publish,video.upload',
    expiresAt,
    refreshExpiresAt,
  });
}

async function getValidTikTokAccessToken(): Promise<string> {
  const tokenRow = await getTikTokOAuthToken();
  if (!tokenRow) {
    throw new Error(
      `لم يتم ربط حساب تيك توك (${OFFICIAL_TIKTOK_HANDLE}) بعد. افتح لوحة المسؤول واضغط «ربط حساب تيك توك».`
    );
  }

  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  if (new Date(tokenRow.expiresAt).getTime() > fiveMinutesFromNow) {
    return tokenRow.accessToken;
  }

  const clientKey = (process.env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
  if (!clientKey || !clientSecret) {
    throw new Error('مفاتيح تيك توك غير متوفرة لتجديد جلسة النشر التلقائي.');
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: tokenRow.refreshToken,
  });

  const refreshRes = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: body.toString(),
  });

  const refreshJson = (await refreshRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    open_id?: string;
    scope?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!refreshRes.ok || !refreshJson.access_token) {
    throw new Error(
      refreshJson.error_description ||
        refreshJson.error ||
        'انتهت صلاحية ربط تيك توك؛ يرجى إعادة ربط القناة من لوحة المسؤول.'
    );
  }

  const nowMs = Date.now();
  const updated = await upsertTikTokOAuthToken({
    openId: refreshJson.open_id || tokenRow.openId,
    username: tokenRow.username,
    displayName: tokenRow.displayName,
    avatarUrl: tokenRow.avatarUrl,
    accessToken: refreshJson.access_token,
    refreshToken: refreshJson.refresh_token || tokenRow.refreshToken,
    scope: refreshJson.scope || tokenRow.scope,
    expiresAt: new Date(nowMs + (refreshJson.expires_in || 86400) * 1000),
    refreshExpiresAt: new Date(
      nowMs + (refreshJson.refresh_expires_in || 30 * 86400) * 1000
    ),
  });

  return updated.accessToken;
}

async function queryTikTokCreatorPrivacyOptions(
  accessToken: string
): Promise<string[]> {
  try {
    const res = await fetch(TIKTOK_CREATOR_INFO_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { privacy_level_options?: string[] };
    };
    return Array.isArray(json.data?.privacy_level_options)
      ? json.data!.privacy_level_options!
      : [];
  } catch {
    return [];
  }
}

export async function uploadAndPublishMp4ToTikTok(options: {
  mp4Buffer: Buffer;
  caption: string;
  isAigc: boolean;
  preferredPrivacyLevel: string;
  postMode: string;
}): Promise<{ publishId: string; finalMode: 'PUBLISHED' | 'INBOX_DRAFT' }> {
  const accessToken = await getValidTikTokAccessToken();
  const videoSize = options.mp4Buffer.byteLength;

  // TikTok Content Posting API v2 chunk sizing:
  // Videos <= 64MB are uploaded in a single chunk where chunk_size = video_size and total_chunk_count = 1
  const chunkSize = videoSize;
  const totalChunkCount = 1;

  const privacyOptions = await queryTikTokCreatorPrivacyOptions(accessToken);
  let effectivePrivacy = options.preferredPrivacyLevel || 'PUBLIC_TO_EVERYONE';
  if (
    privacyOptions.length > 0 &&
    !privacyOptions.includes(effectivePrivacy)
  ) {
    effectivePrivacy = privacyOptions.includes('PUBLIC_TO_EVERYONE')
      ? 'PUBLIC_TO_EVERYONE'
      : privacyOptions[0];
  }

  // TikTok caption title max length is 2200 UTF-16 characters
  const safeCaption = options.caption.slice(0, 2150);

  let publishId = '';
  let uploadUrl = '';
  let finalMode: 'PUBLISHED' | 'INBOX_DRAFT' =
    options.postMode === 'INBOX_UPLOAD' ? 'INBOX_DRAFT' : 'PUBLISHED';

  if (options.postMode !== 'INBOX_UPLOAD') {
    const directRes = await fetch(TIKTOK_DIRECT_POST_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: safeCaption,
          privacy_level: effectivePrivacy,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
          is_aigc: Boolean(options.isAigc),
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    });

    const directJson = (await directRes.json()) as {
      data?: { publish_id?: string; upload_url?: string };
      error?: { code?: string; message?: string };
    };

    const errCode = directJson.error?.code || '';
    if (
      directRes.ok &&
      (!errCode || errCode === 'ok') &&
      directJson.data?.upload_url
    ) {
      publishId = directJson.data.publish_id || '';
      uploadUrl = directJson.data.upload_url;
      finalMode = 'PUBLISHED';
    } else if (
      errCode.includes('unaudited_client') ||
      errCode.includes('privacy_level') ||
      directRes.status === 403
    ) {
      // Automatic fallback to TikTok Inbox Video Upload if the TikTok Developer App is still in un-audited Sandbox mode
      const inboxRes = await fetch(TIKTOK_INBOX_POST_INIT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: chunkSize,
            total_chunk_count: totalChunkCount,
          },
        }),
      });
      const inboxJson = (await inboxRes.json()) as {
        data?: { publish_id?: string; upload_url?: string };
        error?: { code?: string; message?: string };
      };
      if (
        !inboxRes.ok ||
        (inboxJson.error?.code && inboxJson.error.code !== 'ok') ||
        !inboxJson.data?.upload_url
      ) {
        throw new Error(
          inboxJson.error?.message ||
            directJson.error?.message ||
            `رفض تيك توك بدء رفع الفيديو (${errCode || inboxRes.status})`
        );
      }
      publishId = inboxJson.data.publish_id || '';
      uploadUrl = inboxJson.data.upload_url;
      finalMode = 'INBOX_DRAFT';
    } else {
      throw new Error(
        directJson.error?.message ||
          `فشل تهيئة النشر على تيك توك (${errCode || directRes.status})`
      );
    }
  } else {
    const inboxRes = await fetch(TIKTOK_INBOX_POST_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    });
    const inboxJson = (await inboxRes.json()) as {
      data?: { publish_id?: string; upload_url?: string };
      error?: { code?: string; message?: string };
    };
    if (
      !inboxRes.ok ||
      (inboxJson.error?.code && inboxJson.error.code !== 'ok') ||
      !inboxJson.data?.upload_url
    ) {
      throw new Error(
        inboxJson.error?.message ||
          `فشل تهيئة الرفع إلى صندوق تيك توك (${inboxRes.status})`
      );
    }
    publishId = inboxJson.data.publish_id || '';
    uploadUrl = inboxJson.data.upload_url;
    finalMode = 'INBOX_DRAFT';
  }

  // PUT binary MP4 payload to TikTok upload_url
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoSize),
      'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: new Uint8Array(options.mp4Buffer),
  });

  if (!putRes.ok && putRes.status !== 201 && putRes.status !== 206) {
    const putText = await putRes.text().catch(() => '');
    throw new Error(
      `فشل رفع ملف الفيديو MP4 إلى خوادم تيك توك (HTTP ${putRes.status}): ${putText.slice(
        0,
        180
      )}`
    );
  }

  // Optional quick status check (non-blocking if still processing on TikTok side)
  if (publishId) {
    try {
      await fetch(TIKTOK_PUBLISH_STATUS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: publishId }),
      });
    } catch {
      // Ignore transient status poll errors
    }
  }

  return { publishId, finalMode };
}

let isPublishingInProgress = false;

export function isTikTokJobRunning(): boolean {
  return isPublishingInProgress;
}

export async function executeNextSequentialTikTokPublish(options: {
  slotKey: string;
  scheduledTimeLabel: string;
  appBaseUrl?: string;
}) {
  if (isPublishingInProgress) {
    throw new Error('توجد عملية توليد ونشر قيد التنفيذ حالياً، يرجى الانتظار لحظات.');
  }

  isPublishingInProgress = true;
  let logId: number | null = null;

  try {
    const config = await getOrInitTikTokConfig();
    if (!config) {
      throw new Error('تعذر قراءة إعدادات أتمتة تيك توك.');
    }

    // Verify OAuth token exists before spending CPU generating video
    await getValidTikTokAccessToken();

    const batch = computeSequentialBatch(
      config.currentSurahId,
      config.currentFromAyah,
      config.khatmahCycle,
      config.ayahsPerReel
    );

    const caption = buildTikTokReelCaption(batch, config.hashtags);

    const createdLog = await createPublishLog({
      slotKey: options.slotKey,
      scheduledTimeLabel: options.scheduledTimeLabel,
      khatmahCycle: batch.khatmahCycle,
      surahId: batch.surahId,
      surahNameArabic: batch.surahNameArabic,
      fromAyah: batch.fromAyah,
      toAyah: batch.toAyah,
      reciterId: batch.reciter.id,
      reciterNameArabic: batch.reciter.nameArabic,
      caption,
      isAigc: config.isAigcEnabled,
      status: 'GENERATING',
    });
    logId = createdLog.id;

    const baseUrl = resolveContainerBaseUrl(options.appBaseUrl);
    const generated = await generateSequentialKhatmahMp4({
      batch,
      appBaseUrl: baseUrl,
    });

    await updatePublishLog(logId, {
      status: 'UPLOADING',
      videoDurationSec: generated.durationSec,
    });

    const published = await uploadAndPublishMp4ToTikTok({
      mp4Buffer: generated.mp4Buffer,
      caption,
      isAigc: config.isAigcEnabled,
      preferredPrivacyLevel: config.privacyLevel,
      postMode: config.postMode,
    });

    await updatePublishLog(logId, {
      status: published.finalMode,
      tiktokPublishId: published.publishId,
      videoDurationSec: generated.durationSec,
      errorMessage: null,
    });

    const updatedConfig = await advanceTikTokKhatmahCursor(batch.nextCursor);

    return {
      success: true,
      batch,
      publishId: published.publishId,
      finalMode: published.finalMode,
      durationSec: generated.durationSec,
      nextConfig: updatedConfig,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء النشر التلقائي';
    if (logId) {
      await updatePublishLog(logId, {
        status: 'FAILED',
        errorMessage: message.slice(0, 500),
      }).catch(() => {});
    }
    await recordTikTokConfigError(message).catch(() => {});
    throw err;
  } finally {
    isPublishingInProgress = false;
  }
}

export async function runTikTokSchedulerTick(now = new Date()): Promise<{
  triggered: boolean;
  slotKey?: string;
  reason?: string;
}> {
  if (isPublishingInProgress) {
    return { triggered: false, reason: 'already_running' };
  }

  const config = await getOrInitTikTokConfig();
  if (!config || !config.isEnabled) {
    return { triggered: false, reason: 'automation_disabled' };
  }

  const token = await getTikTokOAuthToken();
  const creds = getTikTokCredentialsStatus();
  if (!token || !creds.isConfigured) {
    return { triggered: false, reason: 'oauth_not_connected' };
  }

  let configuredSlots = FIXED_DAILY_SLOTS_24H;
  try {
    const parsed = JSON.parse(config.scheduleSlotsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      configuredSlots = parsed;
    }
  } catch {
    configuredSlots = FIXED_DAILY_SLOTS_24H;
  }

  const zoned = getZonedDateParts(now, config.timezone || 'Africa/Cairo');
  const nowTotalMin = zoned.hour * 60 + zoned.minute;

  // Match if current time in target timezone is within [slotMinute, slotMinute + 12 minutes]
  // so even if the server briefly restarts at the top of the hour, the slot still fires once.
  let matchedSlot: string | null = null;
  for (const slot of configuredSlots) {
    const [sh, sm] = slot.split(':').map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm)) continue;
    const slotMin = sh * 60 + sm;
    const diff = nowTotalMin - slotMin;
    if (diff >= 0 && diff <= 12) {
      matchedSlot = slot;
      break;
    }
  }

  if (!matchedSlot) {
    return { triggered: false, reason: 'outside_slot_window' };
  }

  const slotKey = `${zoned.dateKey}_${matchedSlot}`;
  const alreadyHandled = await hasCompletedOrRunningSlot(slotKey);
  if (alreadyHandled) {
    return { triggered: false, slotKey, reason: 'slot_already_completed' };
  }

  await executeNextSequentialTikTokPublish({
    slotKey,
    scheduledTimeLabel: `${zoned.dateKey} · ${formatSlotArabic(matchedSlot)}`,
    appBaseUrl: resolveContainerBaseUrl(),
  });

  return { triggered: true, slotKey };
}

let schedulerIntervalHandle: ReturnType<typeof setInterval> | null = null;

export function startTikTokDailyScheduler() {
  if (schedulerIntervalHandle) return;

  cleanupStaleGeneratingLogs().catch(() => {});

  // Ensure singleton config row exists on startup
  getOrInitTikTokConfig()
    .then(() => {
      console.log(
        `[TikTok Khatmah Scheduler] Active for ${OFFICIAL_TIKTOK_CHANNEL_URL} — 10 fixed daily slots.`
      );
    })
    .catch((err) => {
      console.error('[TikTok Khatmah Scheduler] Initial DB check warning:', err);
    });

  schedulerIntervalHandle = setInterval(() => {
    runTikTokSchedulerTick().catch((err) => {
      console.error('[TikTok Khatmah Scheduler] Tick error:', err);
    });
  }, 30_000);
}
