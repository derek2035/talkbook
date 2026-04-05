# Talkbook Codex Instructions

Always respond in Simplified Chinese.

## gstack
Use gstack skills when they are the best fit for the current task.
Prefer `gstack-browse` for browser-based investigation and QA flows in this repo.
Available skills: `gstack-office-hours`, `gstack-plan-ceo-review`, `gstack-plan-eng-review`, `gstack-plan-design-review`, `gstack-design-consultation`, `gstack-review`, `gstack-ship`, `gstack-browse`, `gstack-qa`, `gstack-qa-only`, `gstack-design-review`, `gstack-setup-browser-cookies`, `gstack-retro`, `gstack-investigate`, `gstack-document-release`, `gstack-careful`, `gstack-freeze`, `gstack-guard`, `gstack-unfreeze`, `gstack-upgrade`.
If gstack skills are missing or stale, run `cd ~/.claude/skills/gstack && ./setup --host auto`.

## Working Method
Default to the `shi-shi-qiu-shi-workflow` method for work in this repo.
- Start from code, docs, logs, tests, and observed behavior instead of assumptions.
- Investigate the relevant context before concluding or editing.
- Identify the principal contradiction and solve that before side issues.
- Prefer small executable steps and validate them through tests, runtime checks, or observable results.
- When evidence changes, correct the path directly instead of defending the earlier judgment.
