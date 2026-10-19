# Katatib trusted-device offline opening and record sync

This is part of the same test site, `katatib-64049`; it does not deploy the original project, change billing, or supply shared audio storage.

## Teacher workflow

1. While online, sign in on a private, locked phone. Open **Offline device / العمل دون اتصال** above the classroom screen.
2. Choose the class date and up to ten printed Warsh pages. Check the trusted-device box, then **Prepare for offline use**. Wait for the ready message. The current limit is 200 assigned students per preparation.
3. Use the browser's **Install app / Add to Home Screen** action if desired. An installed shortcut is optional; the prepared website URL also opens offline. First-time visitors cannot download it without a connection.
4. With no connection, reopen the same site/profile. The last authorized staff identity and downloaded roster are available. Downloaded attendance is limited to the chosen date and three sessions. Learning, task/history and reports use downloaded records plus local changes. Selected printed Mushaf pages work offline; other pages require preparation/connectivity.
5. Save normally. The device explicitly shows **Saved on this device — waiting to sync**, with a persistent pending count. Closing/reloading the tab does not discard accepted queue entries. A failed device-storage write is an error, not a successful save.
6. Reopen the app when connected. It retries on reconnection, app activation, while visible with pending changes, and through **Sync now**. Keep the app open until pending reaches zero, then refresh records. Sync while the app is closed is not guaranteed.
7. If a change is blocked, export a private copy and review its payload. It is not silently rebased over another edit. **Keep server version** dismisses this record's local pending chain, retaining dismissed entries locally for review. Re-enter any desired correction after refreshing the server record. Account/access changes must be resolved with the administrator.
8. Print/PDF or export reports from the available data. Reports with pending local changes are labelled both on screen/print and in the spreadsheet. Device-only totals are not a claim that the server already received them.

## Data, access and durability

- Online-only/tab-session behavior is the default. Explicit preparation changes Firebase Auth to local persistence. This allows a real SDK identity to restore in a new offline tab, rather than inventing a local user or bypassing Google login. Preparing a private phone intentionally retains its authorized student records in IndexedDB.
- Device records and queue entries are separated by Firebase UID, not just by email. A different signed-in account does not read another account's download or send its queue. Server authorization is checked again before replay. Permission denial never falls back to a cached server response. Offline access necessarily uses the last verified authorization; immediate remote revocation cannot be detected without a connection.
- Pending operations retain stable IDs and original expected revisions. Atomic IndexedDB writes and Web Locks prevent competing tabs from losing queue changes. Replay is serialized separately from local saves, so a slow network transaction cannot prevent another local save. Server transactions/rules remain authoritative.
- The queue supports student/teacher attendance, V2 learning/corrections, verse marks, tasks, original-plan status overlays, original-learning correction overlays, and schedules. The interface still respects role restrictions. Account grants, credential provisioning, enrollment/import, reviewed quizzes and other actions remain online-only. No original collection is written.
- Up to 500 pending changes and 12 MiB of account JSON are accepted. Storage/quota failure keeps the current unsaved form rather than claiming success. Browser persistent-storage permission is requested but may be refused. Clearing site data, removing the browser profile or device storage eviction can destroy unsynced data. The private JSON export is an audit/recovery reference, not an automatic Firebase import or a credential backup.
- Sign-out is blocked while the current account has pending work, to prevent accidental loss; synchronize or review/export/dismiss it first. Removing offline data requires an empty active queue and returns Auth to session persistence. Signing out removes that account's device download. Public shell and Quran artwork caches contain no student records.
- Audio tests and the existing full recorder are **not** durable queued cloud recordings. Their current local lifetime/download limits remain. Consent-enforced shared audio upload, retention and durable audio recovery are still open product work.

## Resource package

`sw.js` is restricted to the test Hosting domains and localhost. Explicit preparation downloads the exact shell listed in `offline-shell.json`, verifies every local asset's SHA-256, validates the fixed test Firebase config, and follows the pinned SDK module dependencies. A staging cache is activated only after the full package succeeds; a failed/mixed deployment does not replace the prior prepared package. Private Firebase API responses never enter Cache Storage. Printed Warsh pages are stored separately only after size/Git fingerprint verification.

After changing the app assets, run:

```bash
python3 scripts/katatib-offline-manifest.py
```

CI and the owner deployment command reject a stale shell manifest. Updates do not force an immediate reload that could discard a classroom draft. Prepare again while connected to refresh the offline package after a deployment.

## Validation and remaining acceptance

Model tests cover queue reload, sequential local revisions, stable retries after a lost acknowledgement, concurrent tabs, blocked conflicts, UID separation, permission denial, unknown class dates, validation and saves during a slow sync. Browser tests exercise a real service worker, IndexedDB and a completely offline cold navigation, printed Warsh cache, local classroom writes/reports/print/Excel, and reconnection; Firebase is replaced at the HTTP test boundary there. Separate Firebase Auth emulator checks exercise actual SDK trusted-device persistence, and Firestore emulator checks retain server role/transaction coverage.

Physical Android/iPhone installation, storage pressure, actual microphones and a real classroom with weak connectivity still require observation. A successful automated run does not approve production migration.
