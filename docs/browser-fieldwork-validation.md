# Browser fieldwork implementation status

This implementation is not approved for production fieldwork. `browserFieldworkEnabled` defaults to false. Existing Android offline work packages remain separate.

Implemented foundations: encrypted per-account IndexedDB storage, atomic local document/queue/photo writes, explicit project downloads, draft entry, persisted request IDs, SQL transaction receipts, existing API permission checks, equipment sequence allocation on the server, a production service worker, and a fieldwork/Sync Center interface.

Verified on 16 November 2026: TypeScript compilation, backend build, and existing frontend regression suite (203 tests in 46 suites). These tests do not establish complete offline acceptance.

## 18 November 2026 — local enablement and acceptance work

Rollout switch: `browserFieldworkEnabled: 'local'` enables browser fieldwork only on loopback hosts.
Production remains disabled. See `docs/browser-fieldwork-local-testing.md`.

Fixed:

- Checklist saves (`InspectionActivities.SaveCategorySelection`) are now in the idempotent fieldwork allowlist with
  equipment scope, project assignment, request hashing, receipt replay and an integer version check (409 returns the
  current server checklist).
- Checklist conflicts load from `GET api/fieldwork/projects/{projectId}/records/checklist/{equipmentId}` and resolve
  checkpoint-by-checkpoint; both versions are retained (append-only server snapshots, local conflict history).
- A queued checklist save following a synchronized one now uses the predecessor's server version; unchanged
  checklists are no longer re-saved on every inspection draft.
- Vault format v2: a random data key wrapped by the password-derived key. Existing v1 vaults upgrade in place on
  unlock. A password change re-keys with the previous password; nothing is re-encrypted or deleted. If the previous
  password is unknown the old vault can be set aside (kept) and recovered later.
- Token expiry pauses synchronization (local work continues within the 8-hour offline window) with in-place sign-in;
  assignment is revalidated per project before every sync (`GET api/fieldwork/projects/{projectId}/access`).
- Pre-existing backend defect: `GET api/surveyor/equipment/{id}` failed (untranslatable EF ordering) and blocked every
  project download.
- Locked workspace after refresh offers unlock instead of a dead end; offline reload offers offline sign-in.

Verified on the disposable local stack (real API + SQL Server container, production bundle on localhost, Chromium):
see the final report of this change for the step list. Not verified: physical iPhone Safari / Android browsers,
PWA install prompts, storage-quota exhaustion, and Android native builds (no Android SDK in the test environment).

Second round (same day):

- Downloads now include controlled equipment reference documents (equipment, area and project scope; SHA-256 checked
  on the device; skipped when `EquipmentDocuments:Enabled` is false). Verified in the bundle: hazardous-area plan,
  common layout, area images, reference document, historical inspection photos and the equipment checklist selection.
- Unsaved equipment and defect forms are restored after a restart (encrypted workspace draft); nothing is queued
  until "Save on device". The leave-page warning covers queued changes only, because form input is already saved
  on the device.
- Stuck changes: Sync Center shows which change another one is waiting for. A change and everything depending on it
  can be **set aside** (kept on the device, never sent), downloaded as JSON and restored later. Set-aside changes are
  excluded from synchronization.
- Inspections: a draft started without a server inspection now conflicts (instead of overwriting) when another device
  already answered the same checkpoint; resolution is per checkpoint. If checkpoint wording changed after an
  inspection was opened, the inspection keeps its server wording (the equipment checklist keeps the new wording);
  answers to checkpoints no longer on the inspection are kept on the device, not sent.
- Editing an existing defect no longer re-queues the server's own photo records.
- Server: a replaced defect photo is deleted only after the fieldwork transaction commits; files stored by a
  fieldwork request are removed if it rolls back (`FieldworkFileTransaction`).
- The status line never shows an earlier "All Changes Synced" while changes are waiting.
- Storage full: a save that does not fit is refused with "Device storage is full. This change was NOT saved." and
  existing device data is unaffected. Tested by simulating the browser's quota failure (transaction aborted with
  `QuotaExceededError`), because Chromium's quota emulation did not reliably limit IndexedDB in the test browser.
- Downloads: a download that finishes after changes were saved for the same project no longer replaces the device
  copy (it is cancelled with a message); saving stays disabled in the same tab until a download finishes.

Remaining release blockers:

- Validate current iPhone Safari and Android browsers on devices and complete PWA installation checks.
- Real-device storage pressure and eviction behaviour (only a simulated quota failure was tested).
- Native Android build verification (no Android SDK in the test environment; no Android code was changed).
- Decide the 8-hour offline window policy.
- Authorization of production rollout.

Backend migration generated: `20261116053821_BrowserFieldworkReceipts`. It has not been applied by this work. No live database changes were performed.

Do not enable the rollout merely because compilation or existing regression tests pass. Preserve local copies until server acknowledgement, and retain failed/conflicted work until explicit authorized resolution.
