# Sprint 01 — Software Requirements Specification
### Aether — Quick Capture Loop

**Status:** Draft, pending Founder approval
**Governs:** Implementation only. Does not add, remove, or reinterpret anything in Product Bible v1.0.

---

## 1. Hypothesis (this sprint exists to test exactly one thing)

> A user can capture a thought in under two seconds, without a save action, without feeling the app get in their way.

Sprint 1 is done when this hypothesis is either **confirmed** (proceed to Sprint 2 per roadmap) or **falsified** (fix the capture loop before building anything else on top of it). It is not done when a checklist of code tasks is complete.

---

## 2. Sprint Goal

Prove the capture loop — not build a feature set.

```
Alt+Space → palette appears → type → Enter → saved → palette closes
```

Nothing else ships in Sprint 1.

---

## 3. In Scope

| # | Capability | User-facing? |
|---|---|---|
| 1 | Global hotkey (Alt+Space) opens/closes the palette from anywhere in Windows | Yes — the one capability this sprint delivers |
| 2 | Palette window: single text input, no other UI elements | Supports #1 |
| 3 | Enter saves the input as a plain-text entry and closes the palette | Supports #1 (autosave was already promised in Product Bible v1.0 — "Zero Save Button" — this sprint is where that promise is first implemented, not a new capability being introduced) |
| 4 | Esc closes the palette without saving | Supports #1 |
| 5 | Local persistence (SQLite, single table) | Infrastructure |
| 6 | Hotkey registration, window management (Tauri) | Infrastructure |

---

## 4. Explicitly Out of Scope (Sprint 1 Kill List)

Do not implement, do not scaffold, do not add "just in case":

- Search
- Tags, folders, categories
- Markdown rendering or rich text
- Task/todo distinction (everything typed is just a captured note in Sprint 1)
- Settings screen or preferences
- Themes / light-dark toggle
- Reminders, due dates
- Desktop widget
- AI, in any form
- Sync, cloud, accounts
- Onboarding flow, tutorials, empty states beyond a blank input

If Antigravity AI proposes any of the above during implementation, the correct response is: **log it in `Future_Wow_Features.md`, do not build it.**

---

## 5. Functional Requirements

**FR-1** — Pressing Alt+Space from any Windows context toggles the palette open/closed.
**FR-2** — On open, the palette is focused and ready for text input immediately (no click required).
**FR-3** — Pressing Enter with non-empty input persists the text to local SQLite and closes the palette.
**FR-4** — Pressing Enter with empty input does nothing (palette stays open).
**FR-5** — Pressing Esc closes the palette and discards any unsaved input.
**FR-6** — Losing focus (click elsewhere) closes the palette. Unsaved input is discarded — Sprint 1 does not implement draft-recovery; if this feels bad in testing, that itself is a finding to bring back to the Founder, not a reason to add a feature mid-sprint.

---

## 6. Non-Functional Requirements (these are the actual test of the hypothesis)

| Metric | Target |
|---|---|
| Hotkey press → palette visible, focused | < 100ms |
| Enter press → entry saved → palette closed | < 100ms |
| Cold app start (background process ready) | < 300ms |
| Idle RAM | < 100MB |
| Idle CPU | ~0% |
| Visible flicker on open/close | None |
| Blocking dialogs of any kind | None |

---

## 7. Definition of Done

Sprint 1 is complete only when **all** of the following are true, verified by the Founder using the app, not by reading code:

- [ ] Alt+Space works from any app, any window state
- [ ] Palette appears with zero flicker
- [ ] Typing has no input lag
- [ ] Enter saves and closes in one motion, no confirmation step
- [ ] Esc discards and closes cleanly
- [ ] Total capture time (hotkey → saved) feels like under 2 seconds without needing a stopwatch to confirm it
- [ ] No loading spinners, no freezes, no save dialogs anywhere in the loop
- [ ] Entries persist correctly across app restarts (SQLite file survives)

If any item fails, Sprint 1 is not done — regardless of how much code has been written.

---

## 8. Constitution Compliance

This SRS does not introduce features. Every capability listed in Section 3 traces directly to the Sprint 1 Goal in Product Bible v1.0 (roadmap section). Any deviation requires Founder sign-off, not engineering judgment.
