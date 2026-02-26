# Voice Recording — Whop Mobile Workaround

## Problem

Voice capture works on desktop (inside Whop iframe) and on mobile browsers
(Safari, Chrome), but **fails on mobile inside the Whop native app**. The mic
button press instantly returns "try again" with no actual recording.

## Root Cause

Whop mobile embeds the app in an iframe/webview. On mobile, the embedding
environment does **not** grant `microphone` via the Permissions Policy
(`allow` attribute on the iframe). This means:

- `navigator.mediaDevices.getUserMedia({ audio: true })` rejects immediately
  with `NotAllowedError` (policy-blocked, not user-denied).
- `document.permissionsPolicy?.allowsFeature('microphone')` returns `false`.
- The Web Speech API (`SpeechRecognition`) is also unavailable in most
  mobile webviews.

This is **not** a bug in our code — we cannot change Whop's iframe
attributes from inside the iframe.

## Solution: Two Capture Modes

### Mode A — Inline Capture (where mic works)

Standard browser audio: `getUserMedia` + `MediaRecorder` or `SpeechRecognition`.
Works on desktop browsers (including inside Whop), mobile Safari/Chrome (direct),
and any context where mic permissions are available.

Strategy chain:
1. **SpeechRecognition** — real-time transcription (Chrome, Edge, Safari desktop)
2. **getUserMedia + MediaRecorder** — server-side Whisper transcription

### Mode B — Breakout Capture (Whop mobile fallback)

When inline capture fails (policy block, instant rejection <100ms, or no
MediaRecorder support), the app automatically opens an external `/voice-capture`
page in the system browser. This works because the system browser is not
constrained by Whop's iframe policy.

Flow:
1. User taps mic → inline attempt fails instantly
2. App creates a capture session (`POST /api/voice/capture-session`)
3. Opens `/voice-capture?session_id=xxx` in system browser
4. User records audio on external page
5. Audio uploaded to `POST /api/voice/upload` (server transcribes + parses)
6. User returns to app → result fetched via `GET /api/voice/session-result`
7. Normal confirmation + execute flow continues

### Text Input (last resort)

If breakout session creation fails, the user can type their command manually.

## Key Technical Details

### Pre-detection on mount

`detectInlineBlocked()` from `lib/voice/service.ts` runs on mount to check:
- Permissions Policy API (both modern and legacy)
- iframe status
- Mobile webview UA heuristics

Result is read **synchronously** in the tap handler — no async before
routing to breakout, which would lose the gesture context.

### Instant rejection detection

If `getUserMedia` rejects in <100ms, it's a container-level policy denial
(not a user prompt that was dismissed). These go straight to breakout,
never showing "try again".

### Session persistence

`last_voice_session_id` is stored in localStorage for recovery if the
redirect back from the external page loses the URL param.

### "I'm back" button

During breakout state, the VoiceButton shows an "I'm back" button that
triggers a manual re-check of the session result, in addition to the
automatic 5-second polling.

## Diagnostics

Append `?voice_debug=1` to the URL (or set `NEXT_PUBLIC_VOICE_DEBUG=1`) to
enable the Voice Debug Overlay. It shows:

- Environment info (userAgent, isSecureContext, isIframe, origin)
- Permissions Policy microphone status
- MediaRecorder MIME type support
- Microphone permission state
- getUserMedia probe (time-to-reject measurement)
- Runtime errors captured during recording attempts
- **Copy JSON** button for easy sharing

## Backend Endpoints

- `POST /api/voice/capture-session` — Create breakout capture session (10-min TTL)
- `POST /api/voice/upload` — Accept audio + session_id, transcribe, parse, store
- `GET /api/voice/session-result` — Poll for session status + parsed result
- `POST /api/voice/transcribe` — Direct audio transcription (inline mode)
- `POST /api/voice/parse` — Text transcript → LLM proposed action
- `POST /api/voice/execute` — Execute confirmed voice command

## Database

`voice_capture_sessions` table stores breakout session state:
- Status: created → uploaded → transcribed → parsed (or failed/expired)
- Transcript, parse_result (JSONB), audio_path, error_message, return_url

## Files

- `lib/voice/service.ts` — VoiceCaptureService: strategy routing, session helpers
- `lib/voice/capture.ts` — Low-level capture: MediaRecorder, env detection, diagnostics
- `lib/hooks/useVoiceScheduling.ts` — Voice state machine hook
- `components/blocks/voice/VoiceButton.tsx` — Mic button with breakout state UI
- `components/blocks/voice/VoiceConfirmationSheet.tsx` — Proposal confirmation + text input
- `components/blocks/voice/VoiceDebugOverlay.tsx` — Diagnostics overlay
- `app/voice-capture/page.tsx` — External breakout recording page
- `app/api/voice/upload/route.ts` — Audio upload + transcribe + parse pipeline
- `app/api/voice/capture-session/route.ts` — Create capture sessions
- `app/api/voice/session-result/route.ts` — Poll session results
