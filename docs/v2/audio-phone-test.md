# Phone recording and clipping test

The **Recording test / اختبار التسجيل / Test audio** screen is available to staff in the same test website, including a link below the Mushaf's audio section. It tests the phone feasibility requirement before shared audio is enabled. It is not shared storage, an offline queue, a student recording, or a recording attached to a saved student mark.

## What to test on a real phone

1. Use your own voice. Open the test and allow the microphone.
2. Record for six seconds, choose a Warsh surah/verse and tap a mistake mark.
3. Keep speaking for at least ten more seconds, then stop.
4. Play the clip. Check that the mistake is included, with the surrounding speech.
5. Choose **Measure compressed size**. It re-encodes this clip in real time without reopening the microphone. Play the compressed result too.
6. Download the test report. It contains codec, measured sizes, timing and playback facts; no audio, student name, student ID or authentication credentials. If a device fails, the report records a bounded error category and its browser identity.

Also try denying microphone permission, stopping shortly after a mark, and leaving the recording page. Errors must not affect the saved Mushaf marks or attendance.

## Implementation and limits

The pilot is deliberately bounded to 60 seconds, eight cues, 8 MiB of compressed capture and eight million decoded channel-samples. Its default windows are five seconds before and ten seconds after the selected cue. Shortened beginning/end windows are explicitly labelled with the actual available seconds. The normal 20-minute and exam 45-minute workflows remain separate full-product work; this pilot does not claim those limits or whole-session offline safety.

The source is one completed MediaRecorder recording, with a requested 24,000-bit/s rate. The browser's reported rate and measured byte/time rate are recorded separately. A completed file is decoded with Web Audio and each marked window becomes a standalone 16 kHz, mono, 16-bit PCM WAV. This avoids the false assumption that arbitrary MediaRecorder timeslices can be played as separate files. Once processing finishes, no whole-session playback/download is retained. With no marks, no recording is retained at all.

A full 15-second WAV is exactly 480,044 bytes, including its header. This is a portable clipping test format, not an economical cloud-storage choice. The optional compression measurement decodes one clip and routes its samples through a MediaStreamDestination to the browser's supported MediaRecorder codec. It measures the actual complete output, never assumes the requested bitrate was honored, and does not acquire the microphone again. WAV and compressed clips can be downloaded individually. Removing a clip hides it from playback and retained-byte totals; undo is possible until the test is cleared.

Audio, decoded samples and blob URLs remain local/in memory. No Firebase audio writes, server upload, billing configuration, account changes or persistent local audio database are introduced. Navigation/reset/logout stops tracks, timers and active encoding and revokes audio URLs. A permission response arriving after cancellation is also cleaned up. Backgrounding stops capture; backgrounding compression cancels it without claiming a successful compressed file. Reloading loses this pilot's audio, which is stated in its device-only flow.

## Verification

Model tests validate exact time windows, short-boundary flags, WAV headers/samples, downmix/resampling and report totals. A Chromium test uses a synthetic microphone tone with the real MediaRecorder/Web Audio pipeline to verify clip sound, a full 5/10-second window, independent WAV and compressed decoding, duration, playback facts, remove/undo, cancellation after delayed permission, background stop, no-mark discard, staff-only UI and no network mutations. This proves browser pipeline behavior; it cannot establish microphone quality or codec compatibility on the owner's physical Android/iPhone.

## What the result will decide

Actual-phone listening, codec support, timing and measured compressed sizes determine whether to proceed with authenticated chunk storage and upload recovery. Shared verse playback still needs consent enforcement, access-controlled manifests/chunks, a real quota budget, idempotent upload, expiry/cleanup and linked-family playback. The existing local full-recording screen remains available while those features are unfinished.
