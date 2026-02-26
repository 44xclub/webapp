# Voice Recording — Whop Mobile Fallback

## Problem

Voice capture works on desktop (inside Whop iframe) and on mobile browsers
(Safari, Chrome), but **fails on mobile inside the Whop app**. The mic
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

## Solution: Strategy-Based Capture with Automatic Fallback

The voice capture module (`lib/voice/capture.ts`) now attempts strategies in
order:

### Strategy 0: Web Speech API (desktop browsers)
Real-time transcription using `SpeechRecognition` / `webkitSpeechRecognition`.
Works in Chrome, Edge, Safari on desktop.

### Strategy 1: getUserMedia + MediaRecorder
Standard web audio capture with server-side Whisper transcription.
Works on mobile browsers and desktop webviews that allow mic access.

### Strategy 2: `<input type="file" accept="audio/*" capture>` (Whop mobile fix)
When Strategy 1 fails (getUserMedia blocked by policy), we trigger a hidden
file input with `capture` attribute. This invokes the **OS-level recording
UI** (e.g. iOS Voice Memos, Android audio recorder) which bypasses iframe
Permissions Policy entirely since the recording happens outside the webview.

The user records audio via the OS UI, we receive the audio file as a Blob,
upload it to our Whisper transcription endpoint, and continue the normal
flow: transcript → parse → confirm → create block.

### Strategy 3: Text input (last resort)
If all audio strategies fail, the user can type their command manually.

## Diagnostics

Append `?voice_debug=1` to the URL (or set `NEXT_PUBLIC_VOICE_DEBUG=1`) to
enable the Voice Debug Overlay. It shows:

- Environment info (userAgent, isSecureContext, isIframe)
- Permissions Policy microphone status
- MediaRecorder MIME type support
- Microphone permission state
- Runtime errors captured during recording attempts
- **Copy JSON** button for easy sharing

## Server-Side Changes

The transcription endpoint (`/api/voice/transcribe`) now:

- Accepts variable MIME types (webm, mp4, m4a, aac, wav, etc.)
- Maps content-type to appropriate file extension for Whisper
- Logs incoming audio metadata (content-type, size, mapped filename)
- Returns structured error codes alongside error messages

## Files Changed

- `lib/voice/capture.ts` — Strategy-based capture module
- `lib/hooks/useVoiceScheduling.ts` — Refactored to use capture strategies
- `components/blocks/voice/VoiceButton.tsx` — New `file_capture` state
- `components/blocks/voice/VoiceDebugOverlay.tsx` — Diagnostics overlay
- `components/blocks/voice/VoiceConfirmationSheet.tsx` — file_capture state handling
- `app/api/voice/transcribe/route.ts` — Robust multi-format audio handling
