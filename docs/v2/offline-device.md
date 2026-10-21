# Katatib trusted-device offline opening and record sync

This is part of the same test site, `katatib-64049`; it does not deploy the original project, change billing, or supply shared audio storage.

## Teacher workflow

1. Sign in while connected on a private, locked phone. Choose **Prepare this phone**, confirm the trusted-device checkbox and wait for completion. The default includes the app, authorized student records and all 604 printed Mushaf pages (~330 MiB). Options can reduce the scope; the private snapshot is limited to 10 MiB and 5,000 selected students, subject to existing server query limits.
2. Optionally install the shortcut using **Install app / Add to Home Screen**. Open the same browser profile offline. Downloaded records and accepted local changes remain available. If installation creates a separate storage profile, prepare that profile while connected too.
3. Save normally. The status shows **Saved on this device — waiting to sync** and a pending count. Closing/reloading the tab keeps accepted queue entries; a failed storage write never claims success.
4. On reconnect, the app checks the downloaded scope without uploading. Choose **Review and sync** to check revisions, upload pending work and refresh the copy. Preparation refuses pending work until you explicitly synchronize or review/dismiss it. There is no automatic reconnect, timer, activation or preparation upload.
5. A conflict retains local work and displays the server version where available. Export before choosing **Keep server version**; this dismisses the local chain for that record. Refresh before entering a new correction. Permission/quota failures can be retried after their cause is resolved. No conflicting revision is forcibly overwritten.
6. Reports can be printed/exported offline from downloaded records plus local changes. Pending/local scope labels apply to screen, print and spreadsheets. Account/security actions and shared audio upload require a connection.

## Data, access and durability

- Online-only/tab-session behavior is the default. Explicit preparation changes Firebase Auth to local persistence. This allows a real SDK identity to restore in a new offline tab, rather than inventing a local user or bypassing Google login. Preparing a private phone intentionally retains its authorized student records in IndexedDB.
- Device records and queue entries are separated by Firebase UID, not just by email. A different signed-in account does not read another account's download or send its queue. Server authorization is checked again before replay. Permission denial never falls back to a cached server response. Offline access necessarily uses the last verified authorization; immediate remote revocation cannot be detected without a connection.
- Pending operations retain stable IDs and original expected revisions. Atomic IndexedDB writes and Web Locks prevent competing tabs from losing queue changes. Replay is serialized separately from local saves, so a slow network transaction cannot prevent another local save. Server transactions/rules remain authoritative.
- The queue supports student/teacher attendance, V2 learning/corrections, verse marks, tasks, original-plan status overlays, original-learning correction overlays, and schedules. The interface still respects role restrictions. Account grants, credential provisioning, enrollment/import, reviewed quizzes and other actions remain online-only. No original collection is written.
- Up to 500 pending changes and 12 MiB of account JSON are accepted. Storage/quota failure keeps the current unsaved form rather than claiming success. Browser persistent-storage permission is requested but may be refused. Clearing site data, removing the browser profile or device storage eviction can destroy unsynced data. The private JSON export is an audit/recovery reference, not an automatic Firebase import or a credential backup.
- Sign-out is blocked while the current account has pending work, to prevent accidental loss; synchronize or review/export/dismiss it first. Removing offline data requires an empty active queue and returns Auth to session persistence. Signing out removes that account's device download. Public shell and Quran artwork caches contain no student records.
- Audio tests and the existing full recorder are **not** durable queued cloud recordings. Their current local lifetime/download limits remain. Consent-enforced shared audio upload, retention and durable audio recovery are still open product work.

## Resource package

`sw.js` is restricted to the test Hosting domains and localhost. Explicit preparation downloads the exact shell listed in `offline-shell.json`, verifies every local asset's SHA-256, validates the fixed test Firebase config, and follows the pinned SDK module dependencies. A staging cache is activated only after the full package succeeds; a failed/mixed deployment does not replace the prior prepared package. Package refreshes are serialized across workers; after a successful switch, old shell packages are removed instead of accumulating on the phone. Private Firebase API responses never enter Cache Storage. Printed Warsh pages are stored separately only after size/Git fingerprint verification.

After changing the app assets, run:

```bash
python3 scripts/katatib-offline-manifest.py
```

CI and the owner deployment command reject a stale shell manifest. Updates do not force an immediate reload that could discard a classroom draft. Prepare again while connected to refresh the offline package after a deployment.

## Validation and remaining acceptance

Model tests cover queue reload, sequential local revisions, stable retries after a lost acknowledgement, concurrent tabs, blocked conflicts, UID separation, permission denial, unknown class dates, validation and saves during a slow sync. Browser tests exercise a real service worker, IndexedDB, pinned Firebase CDN modules imported with networking disabled, and a completely offline cold navigation, printed Warsh cache, local classroom writes/reports/print/Excel, and reconnection; Firebase is replaced at the HTTP test boundary there. Separate Firebase Auth emulator checks exercise actual SDK trusted-device persistence, and Firestore emulator checks retain server role/transaction coverage.

Physical Android/iPhone installation, storage pressure, actual microphones and a real classroom with weak connectivity still require observation. A successful automated run does not approve production migration.

## Complete printed Mushaf download

Offline device and the expandable section below the Mushaf reader offer Download / resume all 604 pages. The pinned source contains 345,453,658 bytes (about 330 MiB), plus browser/cache overhead; use Wi-Fi and keep the tab open. A quota estimate blocks a clearly insufficient download. Unknown estimates do not prove storage is available: browser quota/write failures remain explicit and keep verified cached pages.

The job checks cached pages against their pinned fingerprints, downloads at most two pages concurrently, verifies before storing, and performs a final complete scan before reporting ready. Cancel aborts active requests and keeps completed pages. Resume rechecks and skips valid pages, replacing corrupt/missing ones. A cross-tab Web Lock prevents duplicate download jobs where supported. Check stored pages detects later eviction; no permanently trusted “complete” flag is written.

The reader's standalone download stores public artwork only; the main Prepare this phone action combines it with the app and authorized student records, including whole-Mushaf mark histories. Offline artwork can be viewed without that page's private history; the reader labels the marks unavailable and prevents new marks until its records are prepared. It never treats unavailable history as confirmed empty history. Local recordings are unchanged.

Automated coverage uses all 604 entries with small synthetic page payloads to verify resume, cancellation, corruption, storage rejection, reload/eviction checks and offline cache verification. Real page fingerprints/artwork and reader permissions are tested separately. A real 330 MiB download and device-storage acceptance still need an actual-device trial; CI does not repeatedly download the entire source archive.

## Role-aware offline copy update

Prepare / update offline copy now defaults to 30 recent days through the reference date plus seven upcoming student-attendance days. Admins and managers may choose all authorized student classes or selected classes. Teachers receive assigned students; linked parents/students receive their explicit links. Account/security changes, student provisioning, notice acknowledgements and family-choice changes remain online-only. Existing queued classroom writes retain their validation and conflict handling.

Preparation requires an empty active queue; choose Review and sync explicitly first, and resolve any conflicts. Fresh reads are staged with three bounded workers. Current student attendance is read as a complete scoped collection query, then projected into explicit per-date/session cache entries, avoiding 37×3 individual server reads per student. Failed or incomplete server queries do not manufacture an empty attendance baseline. Learning correction chains and all tasks are retained; ordinary old history is optional. All verse-history pages are prepared per authorized student. The optional reduced-artwork range remains bounded to ten pages; the default downloads all printed pages.

The per-account receipt records the dates, selected student IDs/class names, last successful data update and measured private-cache size. The staged copy is capped at 10 MiB within the device store's 12 MiB total budget, leaving room for queued work. Oversized copies fail explicitly; choose fewer classes or exclude old history. Preparation does not silently truncate large rosters. The existing server query budgets still apply. Account/grant denial clears cached access. Server scope refreshes preserve the selected offline roster; an unprepared but authorized student can still be edited through the ordinary server path while online.

A final local write lock checks that no unsynced work appeared during preparation before replacing the cache. A save made during preparation keeps its queue and prevents that replacement. Data is collected over fresh server reads; this is not an atomic Firestore point-in-time backup or a migration/recovery archive.

Parent/student copies are read-only for educational records. Their sync path may refresh server access but cannot replay forbidden staff writes. Reports/history show the downloaded period/scope when offline, and Excel/print carries that caveat; older selected months may be incomplete unless older history was included. The copy is not every database collection and does not include authentication credentials, private account provisioning material, shared audio, security administration or a downloaded challenge bank.

## Simplified phone workflow (October 21)

1. While connected, choose **Prepare this phone** and confirm that the device is private and locked. Defaults include authorized class records (older history included), the app, and all 604 printed Warsh pages (~330 MiB). The first download needs time and storage; keep the tab open, preferably on Wi-Fi. Verified pages survive an interrupted download. Advanced options can reduce classes, dates or printed pages. Administration of accounts/security and shared audio uploads still requires a connection.
2. Open the same site or installed shortcut offline. Changes are kept per signed-in account in IndexedDB and show a pending count. Public artwork alone never establishes that a student's private mark history is available.
3. On reconnection, a read-only check compares downloaded record scopes with the server. It does **not** upload local work. Choose **Review and sync** to upload, or to fetch detected cloud changes. Successful synchronization refreshes the private snapshot and displays a checked/up-to-date status. Failed checks do not claim freshness.

New preparations fetch all verse marks per authorized student in a paginated, student-scoped query, then index them locally for every page (including verified-empty pages). This removes the old first-two/ten-page private-history limit without making 604 server requests per student. Older prepared copies need one update to gain this coverage. The 10 MiB private-data cap still applies.

Before replay, revision-based attendance and workspace edits are checked against current server records, including a simulation of successive edits to the same record. A detected conflict blocks the batch before upload and preserves a server snapshot beside the local intention for review/export. Transactions also recheck revisions during each commit: synchronization across collections is not one atomic transaction, so a network failure or concurrent server change during replay can leave some confirmed records and some pending. Retries keep stable event IDs; nothing forces an overwrite. Append-only learning and verse marks retain their existing immutable event semantics.

Scope checking runs on opening a prepared account and reconnection, or with **Check for updates**. It compares downloaded record groups, not every production collection or storage object. A phone can lose browser storage; an online freshness check does not prove that every cached artwork file still exists. The complete-Mushaf verification control remains available in the reader.
