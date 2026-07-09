# Sprint 06 — Software Requirements Specification
### Aether — Focus Mode (Do Not Disturb Today View)

**Status:** Draft, pending Founder approval
**Governs:** Implementation only. Integrates global Focus Mode state, palette `/focus` shortcut command, and visual focus adjustments.

---

## 1. Hypothesis
> A user can enter Focus Mode to suppress desktop clutter and focus on their top task, collapsing the desktop widget to display only the active priority task and hiding note previews.

---

## 2. Sprint Goal
Implement persistent Focus Mode state in SQLite. Support toggling Focus Mode via the widget card toggle button or the launcher command `/focus`. When active, adjust the desktop widget UI layout to focus solely on the top priority task.

---

## 3. In Scope

| # | Capability | User-facing? |
|---|---|---|
| 1 | DB Schema update: create `settings` table (key-value) to persist `focus_mode` | Infrastructure |
| 2 | Rust IPC commands `get_focus_mode` and `toggle_focus_mode` | Yes |
| 3 | Command palette syntax `/focus` to toggle Focus Mode state | Yes |
| 4 | Visual Focus Mode layout: widget hides note preview and all tasks except the top task | Yes |
| 5 | Trigger a native Tauri notification toast when Focus Mode is activated | Yes |

---

## 4. Explicitly Out of Scope
- Windows system-wide notification blocker hooks (Focus Assist registry injection is out of scope to avoid permission errors).
- Focus timers or pomodoro sessions.

---

## 5. Functional Requirements
- **FR-1** — The database initialization script automatically creates a `settings` table (`key TEXT PRIMARY KEY, value TEXT NOT NULL`) if it does not exist, seeding `focus_mode = 'false'`.
- **FR-2** — The Rust IPC command `toggle_focus_mode` updates the settings state in SQLite and sends a native Tauri notification:
  - If enabled: "Focus Mode Active. Go make progress!"
  - If disabled: "Focus Mode Off. Welcome back."
- **FR-3** — Typing `/focus` in the command palette toggles the state, triggers the notification, and closes the palette.
- **FR-4** — When Focus Mode is active (`focus_mode = true`):
  - The desktop widget displays "Focusing" in an active state.
  - The tasks list collapses to show **only the top priority task** (the most recent active task).
  - The "Latest Note" card section is hidden.
- **FR-5** — Focus state changes are synced between windows immediately via the 2-second polling loop.

---

## 6. Non-Functional Requirements
- Focus Mode visual collapse and notifications: < 100ms response time.

---

## 7. Definition of Done
- [ ] Settings table initialized and persists focus state.
- [ ] `/focus` inside launcher toggles state and triggers a system notification.
- [ ] Toggling "Focus" button on the widget syncs state immediately.
- [ ] When Focus is active, the widget hides notes and displays only the top uncompleted task.
