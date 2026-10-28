import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const MASTER_ADMIN_EMAIL = 'farouk.gabal@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function isVerifiedMasterAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.emailVerified === true &&
    (user.email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface SiteConfigData {
  siteTitle: string;
  sadaqahLabel: string;
  heroHeadline: string;
  heroSubtitle: string;
  announcementBanner: string;
  defaultSurahId: number;
  defaultFromAyah: number;
  defaultToAyah: number;
  defaultReciterId: string;
  defaultBackgroundId: string;
  allowPublicCustomSadaqah: boolean;
  isPublishedLive: boolean;
}

export const DEFAULT_SITE_CONFIG: SiteConfigData = {
  siteTitle: 'قرآن ريلز',
  sadaqahLabel: 'صدقة جارية عن عائلة فاروق جبل',
  heroHeadline: 'صانع المقاطع القرآنية القصيرة بجودة عالية وتظليل متزامن للكلمات',
  heroSubtitle:
    'أنشئ مقاطع ريلز وشورتس وتيك توك قرآنية بتصميم رأسي احترافي خلال ثوانٍ. اختر من بين ٣٦ قارئاً، حدد الآيات والترجمة، وحمّل الفيديو بصيغة MP4 مجاناً وبلا حقوق أو علامات مائية.',
  announcementBanner: '',
  defaultSurahId: 93,
  defaultFromAyah: 1,
  defaultToAyah: 5,
  defaultReciterId: 'alafasy',
  defaultBackgroundId: 'starry_night',
  allowPublicCustomSadaqah: true,
  isPublishedLive: true,
};

export interface ManagedPresetRecord {
  id: string;
  titleArabic: string;
  subtitleArabic: string;
  surahId: number;
  fromAyah: number;
  toAyah: number;
  reciterId: string;
  backgroundId: string;
  status: 'published' | 'draft';
}

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function sanitizeSlug(val: string, fallback: string, maxLen = 60): string {
  const trimmed = val.trim().slice(0, maxLen);
  return SAFE_ID_REGEX.test(trimmed) && trimmed.length >= 2 ? trimmed : fallback;
}

function clampString(val: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = val.trim().slice(0, maxLen);
  if (trimmed.length < minLen) return fallback;
  return trimmed;
}

export async function signInMasterAdmin(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  if (isVerifiedMasterAdmin(cred.user)) {
    await syncMasterAdminProfile(cred.user);
  }
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncMasterAdminProfile(user: User): Promise<void> {
  if (!isVerifiedMasterAdmin(user)) return;
  const adminPath = `admins/${user.uid}`;
  const adminRef = doc(db, 'admins', user.uid);
  const roleSummary =
    'المالك والمسؤول العام والوكيل والمدير والمحرر والناشر الوحيد لمنصة قرآن ريلز';
  const permissions = 'ALL_PERMISSIONS_OWNER_AGENT_MANAGER_ADMIN_EDITOR_PUBLISHER';

  try {
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        uid: user.uid,
        email: MASTER_ADMIN_EMAIL,
        roleSummary,
        permissions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(adminRef, {
        roleSummary,
        permissions,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, adminPath);
  }
}

export async function saveSiteConfigAsAdmin(
  user: User,
  input: SiteConfigData
): Promise<void> {
  if (!isVerifiedMasterAdmin(user)) {
    throw new Error('غير مصرح بالتعديل إلا لحساب المسؤول الوحيد farouk.gabal@gmail.com');
  }

  const surahId = Math.max(1, Math.min(114, Math.round(input.defaultSurahId)));
  const fromAyah = Math.max(1, Math.min(286, Math.round(input.defaultFromAyah)));
  const toAyah = Math.max(
    fromAyah,
    Math.min(286, fromAyah + 29, Math.round(input.defaultToAyah))
  );

  const sanitized: SiteConfigData = {
    siteTitle: clampString(input.siteTitle, 2, 80, DEFAULT_SITE_CONFIG.siteTitle),
    sadaqahLabel: clampString(input.sadaqahLabel, 2, 120, DEFAULT_SITE_CONFIG.sadaqahLabel),
    heroHeadline: clampString(input.heroHeadline, 5, 180, DEFAULT_SITE_CONFIG.heroHeadline),
    heroSubtitle: clampString(input.heroSubtitle, 10, 350, DEFAULT_SITE_CONFIG.heroSubtitle),
    announcementBanner: input.announcementBanner.trim().slice(0, 240),
    defaultSurahId: surahId,
    defaultFromAyah: fromAyah,
    defaultToAyah: toAyah,
    defaultReciterId: sanitizeSlug(input.defaultReciterId, 'alafasy', 60),
    defaultBackgroundId: sanitizeSlug(input.defaultBackgroundId, 'starry_night', 60),
    allowPublicCustomSadaqah: Boolean(input.allowPublicCustomSadaqah),
    isPublishedLive: Boolean(input.isPublishedLive),
  };

  const configPath = 'site_config/main';
  const configRef = doc(db, 'site_config', 'main');

  try {
    const snap = await getDoc(configRef);
    if (!snap.exists()) {
      await setDoc(configRef, {
        ...sanitized,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(configRef, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, configPath);
  }
}

export async function createManagedPresetAsAdmin(
  user: User,
  preset: Omit<ManagedPresetRecord, 'id'>
): Promise<void> {
  if (!isVerifiedMasterAdmin(user)) {
    throw new Error('غير مصرح بالنشر إلا لحساب المسؤول الوحيد farouk.gabal@gmail.com');
  }

  const presetId = `preset_${Date.now()}`;
  const path = `published_presets/${presetId}`;
  const ref = doc(collection(db, 'published_presets'), presetId);

  const surahId = Math.max(1, Math.min(114, Math.round(preset.surahId)));
  const fromAyah = Math.max(1, Math.min(286, Math.round(preset.fromAyah)));
  const toAyah = Math.max(
    fromAyah,
    Math.min(286, fromAyah + 29, Math.round(preset.toAyah))
  );

  try {
    await setDoc(ref, {
      titleArabic: clampString(preset.titleArabic, 2, 80, 'مقتطف قرآني'),
      subtitleArabic: clampString(preset.subtitleArabic, 2, 60, `سورة ${surahId}`),
      surahId,
      fromAyah,
      toAyah,
      reciterId: sanitizeSlug(preset.reciterId, 'alafasy', 60),
      backgroundId: sanitizeSlug(preset.backgroundId, 'starry_night', 60),
      status: preset.status === 'draft' ? 'draft' : 'published',
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleManagedPresetStatusAsAdmin(
  user: User,
  preset: ManagedPresetRecord
): Promise<void> {
  if (!isVerifiedMasterAdmin(user)) {
    throw new Error('غير مصرح بالتعديل إلا لحساب المسؤول الوحيد farouk.gabal@gmail.com');
  }
  const path = `published_presets/${preset.id}`;
  const ref = doc(db, 'published_presets', preset.id);
  const nextStatus = preset.status === 'published' ? 'draft' : 'published';

  try {
    await updateDoc(ref, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteManagedPresetAsAdmin(
  user: User,
  presetId: string
): Promise<void> {
  if (!isVerifiedMasterAdmin(user)) {
    throw new Error('غير مصرح بالحذف إلا لحساب المسؤول الوحيد farouk.gabal@gmail.com');
  }
  const path = `published_presets/${presetId}`;
  const ref = doc(db, 'published_presets', presetId);

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
