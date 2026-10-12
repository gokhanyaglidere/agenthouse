# Conversation controls

Released Model / Effort / Mode / Skill controls in the session terminal and startup options in New conversation.

- Startup preferences are validated and saved per managed session. New launches and resumed managed history receive native --model, --effort and --permission-mode flags. Background attach and external sessions are unchanged. Existing broker processes are preserved.
- Model and effort controls stage /model and /effort commands in an empty reply draft. Existing text is never overwritten. Users inspect and send the command. Dropdowns are requested choices, not confirmed telemetry. Claude reports account/model support and the active state in its terminal.
- Runtime mode control sends native Shift+Tab; no invented /auto command or bypass mode is exposed. Project guard policy remains effective.
- Operator-only workspace-scoped skill catalog reads project .claude/skills, project .cursor/skills and personal .claude/skills. Directory symlinks and out-of-root skill file symlinks are rejected. Instructions are size limited, with frontmatter removed. Skill instructions are staged as plain text, never automatically sent. This does not implement native skill hooks/scripts or automatically load referenced resources.
- Skill catalog is refreshed explicitly. File names/contents are not logged or committed.

Validation: 144 backend and 48 UI tests passed; production build passed. Live panel verified startup and conversation controls and loaded the skill catalog. /model sonnet was staged and then cleared from a previously empty draft without sending it. No real Claude model/effort/mode changes or paid prompts were submitted. CLI argument construction uses fixture PTYs; model/account acceptance remains native Claude's responsibility.

Screenshots are local ignored verification artifacts. Physical device checks remain deferred.
