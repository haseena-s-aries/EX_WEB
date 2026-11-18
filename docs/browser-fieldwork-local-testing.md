# Browser fieldwork — local testing

Browser fieldwork (download, offline work, Sync Center) is enabled **only on loopback hosts**
(`localhost`, `127.0.0.1`, `[::1]`). `public/config.js` sets `browserFieldworkEnabled: 'local'`;
on any other host (including the production address) the launcher, offline vault and service-worker
registration for fieldwork stay off. Use `true` only after separate production authorization.

The service worker never caches API calls (any origin, any `/api/` path) or requests carrying an
`Authorization` header. It caches only the static app shell listed by the build.

## Option A — production bundle on localhost (closest to real offline behaviour)

```bash
npm run web:offline-local
```

This runs `npm run build` and serves `web-build/` from `http://localhost:3000/` (loopback only) with a
cache-first, revisioned offline shell. The page talks to the local API at `http://localhost:5235/api`.

## Option B — webpack dev server

```bash
npm run web
```

In development the build emits a **network-first** worker: while online every request goes to the dev
server (edits always load); the cached copy is used only when offline. Hot-update files are never
precached. Reload once after the first visit so the page is controlled by the worker before testing
offline reloads.

## Using it

1. Sign in as an assigned **Surveyor** on localhost. A sync dock appears at the bottom right with the
   status (online/offline, pending count, paused for sign-in) and a **Sync Now** button.
2. Open **Fieldwork / Sync** → **Download for Offline Use** on an assigned project.
3. Go offline (browser DevTools → Network → Offline). Add/edit equipment, edit the equipment checklist,
   record inspection results and remarks, add defects and photos. Everything is saved encrypted on the
   device first and queued.
4. Reload while offline: choose **Sign in to offline fieldwork** and sign in with the same password.
   Drafts, queue and photos are restored.
5. Reconnect: sync starts automatically (on reconnect, on returning to the tab, every 30 s while the
   app is open) or use **Sync Now**. Work is shown as synced only after the server confirms it.

Browser background sync is **not** used: nothing synchronizes while the app/tab is closed or suspended.
It resumes the next time the app is opened and unlocked.

### Session expiry and password changes

* When the 1-hour API token expires or is revoked, synchronization pauses (status: *Sign in to resume
  sync*); local work continues within the 8-hour offline window. Sign in again from the Fieldwork panel.
* If the account password changed, the next online sign-in asks once for the **previous** password and
  re-keys the device vault. No record or photo is re-encrypted, moved or deleted. If the previous
  password is unknown, the old vault can be *set aside* (kept, encrypted, not synchronized) and
  recovered later from Sync Center.

## Automated acceptance suite (disposable stack only)

`e2e/run-fieldwork-e2e.js` drives the real backend, a real browser, service worker and IndexedDB:
download → offline edits (equipment, checklist, inspection, remarks, defect, photos) → offline reload →
reconnect with a lost checklist response and an interrupted photo upload (no duplicates) → server
persistence and photo associations → token expiry pause/resume → password change re-key → two-device
conflicts (equipment, checklist, inspection answers, defects with photo replacement) → checkpoint-wording conflict →
account isolation → download completeness (plans, layouts, reference documents, history photos, checklist
selection) → unsaved-form recovery → set aside / export / restore of a rejected change → storage full →
layout audit at 320/360/375/390/414/430/768/1024 px.

It refuses non-loopback targets. Run it **only** against a throwaway database, because it creates
synthetic users and projects:

1. Start a disposable SQL Server (for example a local container) and apply the existing migrations to
   a new, empty database with `dotnet ef database update --connection "<disposable connection>"`.
2. Start the API on `http://localhost:5235` against that database with a non-Development environment
   name (Development is pinned to LocalDB by design), a local `Jwt__SigningKey` and
   `BootstrapAdmin__Email` / `BootstrapAdmin__Password` for the synthetic admin
   (defaults expected by the suite: `e2e-admin@example.test` / set `E2E_ADMIN_PASSWORD`). Also set
   `EquipmentDocuments__Enabled=true` (the reference-document scenario uploads one) and, to check that replaced
   photos are removed from storage, `ProjectPhotoStorage__RootPath=<dir>` with `E2E_STORAGE_ROOT=<same dir>`.
3. `npm run build && npm run serve:offline-local`
4. `npm run test:e2e:fieldwork` (optional args: `api`, `browser`, `layout`;
   set `E2E_ARTIFACTS=<dir>` to keep screenshots and layout findings).

The API rate-limits sign-ins to 20 per 5 minutes per address; the suite waits when it is throttled.

## Stuck changes and storage

* Sync Center shows which change another one is waiting for. **Set aside** stops a change (and everything that
  depends on it) from blocking the queue; it stays encrypted on the device, is never sent, can be downloaded as JSON
  and restored to the queue later.
* When device storage is full, a save is refused with "Device storage is full. This change was NOT saved." Nothing
  already on the device is affected.
