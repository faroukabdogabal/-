# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Exclusive Master Administrator Authority (`isMasterAdmin`)**:
   - Across the entire application, administrative, editorial, managerial, agency, and publishing mutations (`create`, `update`, `delete` on `/site_config/{configId}`, `/published_presets/{presetId}`, and `/admins/{adminUid}`) are strictly restricted to the verified Google account **`farouk.gabal@gmail.com`** (`request.auth != null && request.auth.token.email == 'farouk.gabal@gmail.com' && request.auth.token.email_verified == true`).
2. **PII Isolation (`/admins/{adminUid}`)**:
   - `/admins/{adminUid}` contains the admin's `email` and `uid`. Blanket reads and `list` operations are completely forbidden (`allow list: if false;`). `get` is restricted strictly to `isMasterAdmin() && request.auth.uid == adminUid`.
3. **Public Sadaqah Jariyah Read Boundaries**:
   - `/site_config/main` allows single-document `get` (only for `configId == 'main'`) so unauthenticated visitors can view the published platform configuration. `list` on `/site_config` is denied (`allow list: if false;`).
   - `/published_presets/{presetId}` allows `get` and `list` ONLY when `resource.data.status == 'published'` (or `isMasterAdmin()`), preventing unauthenticated or non-admin scraping of unpublished drafts.
4. **Schema, Key, Size, Temporal & Immutability Enforcement**:
   - Every write enforces `hasAll` and `hasOnly` exact key lists, string `.size()` bounds matching `firebase-blueprint.json`, integer range bounds (`1..114` for `surahId`, `1..286` for `ayah`), regex ID guards (`^[a-zA-Z0-9_\-]+$`), `ownerUid == request.auth.uid`, immutable `createdAt` & `ownerUid` on updates, and `request.time` server timestamp equality on `createdAt` (create) and `updatedAt` (create & update).

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unverified Admin Email Spoof**: Authenticated user with `email == 'farouk.gabal@gmail.com'` and `email_verified == false` attempts `setDoc('/site_config/main', validPayload)` -> `PERMISSION_DENIED`.
2. **Non-Admin Authenticated Write**: Authenticated verified user `attacker@gmail.com` attempts `updateDoc('/site_config/main', ...)` -> `PERMISSION_DENIED`.
3. **Shadow/Ghost Field Injection**: Master admin sends valid `/site_config/main` payload plus `"isSuperRoot": true` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly(...)`).
4. **Value / Resource Size Poisoning**: Master admin sends `heroSubtitle` of length `5000` chars (exceeding `maxLength: 350`) -> `PERMISSION_DENIED`.
5. **Path ID Poisoning**: Master admin attempts to create `/published_presets/bad$id!@#` or `/site_config/other_doc` -> `PERMISSION_DENIED`.
6. **Owner UID Spoofing on Create**: Master admin attempts to create `/published_presets/p1` with `ownerUid: "someone_else"` -> `PERMISSION_DENIED`.
7. **Immutable Field Tampering on Update**: Master admin attempts to modify `createdAt` or `ownerUid` during `updateDoc('/site_config/main', ...)` -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: Payload uses `new Date('2020-01-01')` instead of `serverTimestamp()` (`request.time`) for `updatedAt` -> `PERMISSION_DENIED`.
9. **PII Blanket Read Attack**: Authenticated user `other@gmail.com` attempts `getDoc('/admins/faroukUid')` or `getDocs(collection('/admins'))` -> `PERMISSION_DENIED`.
10. **Draft Preset Query Scraping**: Unauthenticated visitor attempts `getDocs(collection('/published_presets'))` without `where('status', '==', 'published')` when drafts exist -> `PERMISSION_DENIED`.
11. **Invalid Surah/Ayah Domain Bounds**: Payload sets `defaultSurahId: 999` or `defaultFromAyah: 0` or `defaultToAyah < defaultFromAyah` -> `PERMISSION_DENIED`.
12. **Orphan / Arbitrary Collection Write**: User attempts `setDoc('/random_collection/doc1', { a: 1 })` -> `PERMISSION_DENIED` (caught by global safety net).
