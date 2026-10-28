/**
 * Security Rules Dirty Dozen Verification Suite (`firestore.rules.test.ts`)
 * Verifies all 12 adversarial payloads from `security_spec.md` return PERMISSION_DENIED.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authContext: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

const VALID_BASE_CONFIG = {
  siteTitle: 'قرآن ريلز',
  sadaqahLabel: 'صدقة جارية عن عائلة فاروق جبل',
  heroHeadline: 'صانع المقاطع القرآنية القصيرة بجودة عالية',
  heroSubtitle: 'أنشئ مقاطع ريلز وشورتس وتيك توك قرآنية بتصميم رأسي احترافي خلال ثوانٍ.',
  announcementBanner: '',
  defaultSurahId: 93,
  defaultFromAyah: 1,
  defaultToAyah: 5,
  defaultReciterId: 'alafasy',
  defaultBackgroundId: 'starry_night',
  allowPublicCustomSadaqah: true,
  isPublishedLive: true,
  ownerUid: 'farouk_uid_1',
  createdAt: 'SERVER_TIMESTAMP',
  updatedAt: 'SERVER_TIMESTAMP',
};

export const DIRTY_DOZEN_SECURITY_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unverified Admin Email Spoof',
    targetPath: '/site_config/main',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: false },
    payload: VALID_BASE_CONFIG,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Non-Admin Authenticated Write',
    targetPath: '/site_config/main',
    operation: 'update',
    authContext: { uid: 'intruder_1', email: 'intruder@gmail.com', email_verified: true },
    payload: { ...VALID_BASE_CONFIG, ownerUid: 'intruder_1' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow/Ghost Field Injection',
    targetPath: '/site_config/main',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: { ...VALID_BASE_CONFIG, isSuperRoot: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Value / Resource Size Poisoning',
    targetPath: '/site_config/main',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: { ...VALID_BASE_CONFIG, heroSubtitle: 'أ'.repeat(5000) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path ID Poisoning on Singleton SiteConfig',
    targetPath: '/site_config/secondary_shadow_doc',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: VALID_BASE_CONFIG,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Owner UID Spoofing on Create',
    targetPath: '/published_presets/preset_1',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: {
      titleArabic: 'آية الكرسي',
      subtitleArabic: 'البقرة · ٢٥٥',
      surahId: 2,
      fromAyah: 255,
      toAyah: 255,
      reciterId: 'alafasy',
      backgroundId: 'starry_night',
      status: 'published',
      ownerUid: 'spoofed_other_uid',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Field Tampering on Update (createdAt / ownerUid)',
    targetPath: '/site_config/main',
    operation: 'update',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: { ...VALID_BASE_CONFIG, createdAt: 'TAMPERED_TIMESTAMP' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery (Non-request.time)',
    targetPath: '/site_config/main',
    operation: 'update',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: { ...VALID_BASE_CONFIG, updatedAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'PII Blanket Read Attack on /admins',
    targetPath: '/admins/farouk_uid_1',
    operation: 'get',
    authContext: { uid: 'other_user', email: 'other@gmail.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unfiltered Draft Preset Query Scraping',
    targetPath: '/published_presets/draft_1',
    operation: 'get',
    authContext: null,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Invalid Surah/Ayah Domain Bounds',
    targetPath: '/site_config/main',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: { ...VALID_BASE_CONFIG, defaultSurahId: 999 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Arbitrary Unmapped Collection Write',
    targetPath: '/unmapped_collection/doc_1',
    operation: 'create',
    authContext: { uid: 'farouk_uid_1', email: 'farouk.gabal@gmail.com', email_verified: true },
    payload: { test: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
