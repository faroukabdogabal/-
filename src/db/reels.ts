import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { platformMetrics, savedReels } from './schema.ts';

export interface CreateSavedReelInput {
  userUid: string;
  titleArabic: string;
  surahId: number;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  backgroundId: string;
  translationId: string;
  aspectRatio: string;
  sadaqahText: string;
  settingsJson: string;
}

export async function listSavedReelsForUser(userUid: string) {
  try {
    return await db
      .select()
      .from(savedReels)
      .where(eq(savedReels.userUid, userUid))
      .orderBy(desc(savedReels.updatedAt))
      .limit(50);
  } catch (error) {
    console.error('Database listSavedReelsForUser failed:', error);
    throw new Error('تعذر جلب المقاطع المحفوظة حالياً، يرجى المحاولة لاحقاً.', {
      cause: error,
    });
  }
}

export async function createSavedReelForUser(input: CreateSavedReelInput) {
  try {
    const rows = await db
      .insert(savedReels)
      .values({
        userUid: input.userUid,
        titleArabic: input.titleArabic,
        surahId: input.surahId,
        fromAyah: input.fromAyah,
        toAyah: input.toAyah,
        reciterId: input.reciterId,
        backgroundId: input.backgroundId,
        translationId: input.translationId,
        aspectRatio: input.aspectRatio,
        sadaqahText: input.sadaqahText,
        settingsJson: input.settingsJson,
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database createSavedReelForUser failed:', error);
    throw new Error('تعذر حفظ المقطع في مكتبتك حالياً، يرجى المحاولة لاحقاً.', {
      cause: error,
    });
  }
}

export async function deleteSavedReelForUser(reelId: number, userUid: string) {
  try {
    const deleted = await db
      .delete(savedReels)
      .where(and(eq(savedReels.id, reelId), eq(savedReels.userUid, userUid)))
      .returning({ id: savedReels.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('Database deleteSavedReelForUser failed:', error);
    throw new Error('تعذر حذف المقطع المحفوظ حالياً.', { cause: error });
  }
}

export async function getOrInitPlatformMetrics() {
  try {
    const existing = await db
      .select()
      .from(platformMetrics)
      .where(eq(platformMetrics.key, 'global'))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const inserted = await db
      .insert(platformMetrics)
      .values({
        key: 'global',
        exportedVideosCount: 0,
        createdReelsCount: 0,
        sharedSadaqahCount: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      return inserted[0];
    }

    const refetched = await db
      .select()
      .from(platformMetrics)
      .where(eq(platformMetrics.key, 'global'))
      .limit(1);

    return (
      refetched[0] || {
        key: 'global',
        exportedVideosCount: 0,
        createdReelsCount: 0,
        sharedSadaqahCount: 0,
        updatedAt: new Date(),
      }
    );
  } catch (error) {
    console.error('Database getOrInitPlatformMetrics failed:', error);
    throw new Error('تعذر تحميل الإحصائيات حالياً.', { cause: error });
  }
}
