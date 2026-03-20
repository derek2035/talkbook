# Talkbook Claude Instructions

Always respond in Simplified Chinese.

## gstack
Use gstack `/browse` for web browsing or browser QA when those workflows are needed.
Never use `mcp__claude-in-chrome__*` tools in this repo.
Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`.
If gstack skills are missing or stale, run `cd ~/.claude/skills/gstack && ./setup --host auto`.
