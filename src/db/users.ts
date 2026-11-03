import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

const MASTER_ADMIN_EMAIL = 'farouk.gabal@gmail.com';

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  displayName?: string | null;
  emailVerified?: boolean;
}) {
  const { uid, email, displayName = null, emailVerified = false } = params;
  const cleanEmail = email.trim().toLowerCase();
  const resolvedRole =
    emailVerified && cleanEmail === MASTER_ADMIN_EMAIL ? 'admin' : 'user';

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        displayName,
        role: resolvedRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          displayName,
          role: resolvedRole,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('تعذر مزامنة ملف المستخدم حالياً، يرجى المحاولة لاحقاً.', {
      cause: error,
    });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database getUserByUid failed:', error);
    throw new Error('تعذر قراءة بيانات الحساب حالياً.', { cause: error });
  }
}
