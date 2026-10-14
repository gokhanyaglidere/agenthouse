# Agent House TODO

Updated: 2026-10-14. Technical follow-ups are parked at the owner's request; design is the current priority. Unchecked items mean evidence is missing or work remains, not that the feature is known to be broken.

## Technical follow-ups — parked

- [ ] Obtain and retain the Windows-local `host-acceptance.mjs verify` output confirming `writeProof: true`; the panel Write success is already recorded.
- [ ] Retain a complete scoped office trace from before custom child creation through completion, with visual room/character confirmation. Previously captured partial live tool events and persisted completion do not prove the full visual sequence.
- [ ] Finish native-handoff acceptance evidence: selected native process identity/exit, original Windows transcript preservation, other native jobs unchanged, and writable reconnect after handoff. Same-session NATIVE_IDLE_OK / HANDOFF_OK is already verified.
- [ ] Verify project skills and instruction-loading behavior under restricted launches. Explicit agent definitions are fixed; full skills/customization parity has not been established. Keep existing sandbox and permission protections.
- [ ] Investigate Turkish encoding in the imported native test's first user message (e.g. YalnÄ±zca); determine whether the source input or transport introduced it before changing code.
- [ ] Complete real desktop/mobile acceptance, including touch scrolling, keyboard/viewport behavior, dictation and notifications. Physical-device checks were deferred by the owner.

## Verified — do not repeat as unfinished

- [x] Windows host reconnected; host and Tailscale both reported online, sandbox ready.
- [x] Panel test Write(proof.txt), genuine folder trust and one-time file approval worked.
- [x] Built-in child read six inputs; scoped live read/completion events were captured.
- [x] Custom acceptance-reader completed six reads and returned the correct CHILD_OK; verified from work/overview on 2026-10-14.
- [x] Native test conversation 02df5b55-8281-44a1-baef-e5cd28787cad retained both NATIVE_IDLE_OK and subsequent HANDOFF_OK without tool calls; session catalog identifies continuation in WSL.
- [x] Panel test c50bf2cf-58f4-417b-abd1-2ad9eb663303 reconnected writable and displayed persisted history.

## Design — next

- [ ] Choose the next visual scope with the owner before implementation; retain the pixel/cozy direction and office-first clean home screen.
- [ ] Revisit glass walls, door proportions and corners, room-specific furniture/lighting, garden path transitions and zoomed label readability when those areas are selected.
- [ ] Keep currently accepted idle/pet activities; prioritize defects and visual polish over adding more activities.

## Explicitly deferred

- [ ] Slack integration (owner postponed).
- [ ] Real finance data integration (owner postponed).

Evidence and procedure: design/windows-acceptance-runbook-2026-10-14.md. This is a bounded follow-up list, not a guarantee that no other defects exist.
