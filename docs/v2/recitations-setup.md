# Recitations: activation and acceptance

This change targets only the Katatib candidate (`katatib-64049`). It does not migrate or change the original `hifd-kouttab` project, enable Blaze, or change billing.

## Supabase activation (account owner)

The private `recitations` bucket and Firebase third-party integration already exist in the account shown in the conversation. Confirm the project URL in Supabase Settings before deployment: the browser configuration currently uses `https://tqtfnynimyoysfgftkof.supabase.co` and the supplied **publishable** key. No secret is embedded in the website.

1. In that project's **SQL Editor**, review and run `supabase/migrations/202610210001_recitations.sql`. It keeps the bucket private, restricts file types and sizes, creates private recording metadata and quota reservation functions. It adds **no public or authenticated Storage policies**.
2. From this repository in Cloud Shell, deploy the function:
   ```bash
   npx --yes supabase@2 login
   npx --yes supabase@2 functions deploy recitations --project-ref tqtfnynimyoysfgftkof --no-verify-jwt
   ```
   The login is for the project owner in their own terminal. Never paste an access token or service-role key into chat or the website. The hosted function receives its server-only Supabase credentials from the platform.
3. Deploy the candidate website and Firestore rules together:
   ```bash
   bash scripts/deploy-katatib-connected.sh
   ```

`--no-verify-jwt` bypasses Supabase's gateway check for **Supabase-issued** JWTs. It does **not** make this API anonymous: the function verifies Firebase JWT signatures using Google's JWKs, RS256, the fixed issuer/audience `katatib-64049`, and fresh Firestore membership/student reads using the caller's token. It requires staff scope for uploads; authorized families may list/play. No custom Firebase role claim is needed for this server-mediated route. The existing third-party integration may remain enabled, but no broad client RLS policy should be added.

The service role is used only inside the function for private object URLs and metadata. Upload tokens identify one immutable object; playback URLs expire after 60 seconds. Someone possessing a signed URL can use it until it expires. CORS is restricted to the two candidate Firebase origins; it is not the authorization mechanism.

## Recording workflow

- Choose a student, date, session and passage. Confirm this is a private device, record, then **stop**. The completed recording is saved in per-account IndexedDB; audio still being recorded is not crash-resilient.
- Local save is independent of the full-Mushaf preparation. Successful save displays **Saved on this device — waiting to upload**. Storage failure tells the teacher to download before leaving.
- Press **Save recitation online**, or later use the existing **Sync now**. There are no automatic uploads on reconnection.
- The server reserves a stable UUID/path and checks authorized student access. File size and SHA-256 are verified before metadata becomes playable. Lost acknowledgements retry the same UUID/path.
- Online history appears in the student's Learning tab and the session recording panel. **Keep for offline listening** explicitly downloads a private copy. Public Mushaf caching never contains audio.
- A learning-history **Open recitation in Mushaf** action carries its recitation ID and passage. Verse marks can be associated with that recitation; general marks remain separate. Audio started from this selected recitation inherits that link. Standalone audio preserves its student/session/passage without inventing a learning evaluation.
- **New recording** clears the active player but preserves the saved history item. **Delete local copy** removes only the device copy; no cloud files are automatically deleted. Sign-out clears this account's confirmed cached audio; pending audio blocks sign-out until uploaded or explicitly downloaded/reviewed/deleted.

## Limits and maintenance

- Browser recorder: requested 24 kbps, actual codec/bitrate determined by browser; maximum 45 minutes or approximately 32 MiB (a final encoder chunk may exceed the cap and then requires download rather than upload).
- Device audio budget: 256 MiB, plus the separate full Mushaf cache. Browser eviction, clearing site data, or removing the browser profile can remove local audio; a downloaded backup is still useful.
- Server reserves at most **900,000,000 bytes** for this feature, leaving headroom below Supabase's 1 GB plan. This limit includes unfinished reservations and is shared across the project, not per teacher. Other objects manually added to the bucket still consume the provider's allowance.
- The existing pending-change JSON export contains audio metadata only, **not audio bytes**. Download each recording from the session panel for an independent audio backup.
- No automatic cleanup or retention expiry is configured. An administrator must review abandoned reservations/orphan objects and exports before removal. Otherwise interrupted/abandoned recordings can eventually consume reserved capacity.
- Supabase playback bandwidth, Edge Function limits, inactivity pausing and future pricing changes still apply. This is a free-plan pilot, not an unlimited or guaranteed-availability archive. Restore a paused project in Supabase Dashboard → Resume project.
- Downloading audio to verify its checksum also uses service resources; monitor bandwidth/Edge Function usage during the pilot.

## Required live acceptance

The workspace has no Supabase or Firebase deployment credentials. A real end-to-end upload is **not** verified until the owner deploys the SQL/function and candidate site. Check:

1. Teacher records 10 seconds, saves, reloads and plays it from a second authorized device.
2. Airplane-mode recording survives an app restart; explicit Sync now uploads once after reconnection.
3. Interrupt the upload and retry; the recording appears once.
4. An authorized parent/student can play; an unrelated account and anonymous request cannot list, upload or play.
5. Revoke a teacher's assignment and confirm fresh cloud requests fail. Offline copies already downloaded require device handling; offline revocation cannot erase a disconnected phone remotely.
6. Test Android/iPhone playback/codec behavior, low storage, microphone denial, a paused service and near-quota rejection. Check local backup before clearing any data.

## Passage and progress semantics

The pinned Warsh edition has 6,214 ayahs, 60 hizbs and 480 thumuns. Numeric progress uses verified eighth coverage, never an invented fraction based on ayah counts.

Two selectors share one canonical interval: ayah ranges or eighth/quarter/half/whole-hizb/custom eighth ranges, including across hizbs. Warsh verse counts and inside-ayah start offsets are retained. Preview opens the first page and highlights matching ayahs on subsequent pages; inside-ayah boundaries highlight the **whole ayah** and are marked with an asterisk in the range description. This is not word-level highlighting.

The student table maps both entry methods into the same 60×8 grid. Partial coverage uses ◐; full validated memorization uses ✓. Overlaps are merged and correction chains resolved before totals; V1 quantities with unknown locations remain unmapped. Legacy learning documents remain schema 2; exact new intervals use schema 3. Both are readable.

Mistake counts use marks explicitly linked to the selected/latest learning record. Latest marks for one ayah replace earlier marks for counting, while history remains immutable. A general multi-eighth mistake total is not repeated in every cell. An ayah spanning an inside-ayah thumun boundary has no exact per-cell error location, so its per-cell count is left unknown and the detailed marks remain visible. No marks is not proof of a zero-error evaluation.
