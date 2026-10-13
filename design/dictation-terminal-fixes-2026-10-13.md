# Dictation and terminal reading fixes

Owner reports: microphone listens but does not insert text; CLI conversation cannot be scrolled.

Dictation now requests interim results, previews recognition text and commits final output or the latest interim text on explicit stop/end. One recognition run inserts at most once. Cancel/unmount nulls callbacks and cancels its timer, preventing late speech results in another conversation's draft. Service/permission/audio/network errors are visible, listening ends after errors, and a no-result run times out after 20 seconds. Keyboard dictation help focuses the adjacent message field; no speech is automatically sent as a Claude message. The browser still supplies the speech service: this change cannot make an unavailable provider return speech. Real microphone/transcription verification requires the user's voice and permissions, and was not represented as completed.

Session terminal now retains 10,000 normal-buffer lines and intercepts mouse-wheel/touch scroll without emitting CLI input. Upward scrolling in an alternate screen or a terminal with no scrollback opens the persisted transcript reader, avoiding accidental permission/menu key presses. Explicit previous/next-line controls are available, and the transcript reader has start/end/refresh controls plus older-message pagination. Session changes clear old transcript state; requests use the existing generation guard. Dictation diagnostics are no longer hidden inside terminal reply UI. These controls apply to embedded and full session terminals.

Sources checked: official xterm Terminal and buffer documentation; MDN SpeechRecognition. Alternate-buffer scrolling is different from normal scrollback; browser speech availability is limited. https://xtermjs.org/docs/api/terminal/classes/terminal/ ; https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

Verification: 193 backend + 100 UI tests passed. Added final-result deduplication, interim-stop preservation, service-error teardown, bounded timeout/unmount and terminal-scroll routing regression tests. Production TypeScript/build passed after fixing an unused test variable. Existing gateway updated; no session stop, CLI command, message, permission answer or microphone capture used for verification.

## Correction: owner meant live CLI scrolling

The previous alternate-buffer fallback switched to the persisted transcript, which did not meet the owner's request. Removed it. Live terminal never changes to the history tab on scroll. In normal mode it scrolls xterm's native buffer; Erase Display now retains cleared pages. In alternate mode mouse tracking is passed through xterm to Claude rather than intercepted. Touch and explicit up/down buttons use Claude's documented Page Up/Page Down navigation only for the writable controller; ordinary arrows are not used, avoiding prompt-history navigation. Added an explicit CLI details button (Ctrl+O) for Claude's own expanded transcript inside the same terminal.

Official source: https://code.claude.com/docs/en/fullscreen#scroll-the-conversation ; documents native mouse scrolling and PgUp/PgDn. Tests replaced the earlier incorrect history-routing assertion. 193 backend + 100 UI tests passed; final build passed. No model prompt, mode change, task stop or permission answer is needed for the fix.

Live browser verification for the correction: opened Claude's detailed CLI transcript via Ctrl+O in the existing live terminal, then scrolled upward with the wheel and the up control. Older raw CLI output became visible while Live terminal remained selected; the saved web transcript tab was not used. No model prompt or permission response was sent. Screenshot: design/verification/live-cli-scroll-2026-10-13.png.
