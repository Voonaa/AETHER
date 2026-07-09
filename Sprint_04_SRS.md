# Sprint 04 — Software Requirements Specification
### Aether — Task Status & Completion (Daily Planner)

**Status:** Draft, pending Founder approval
**Governs:** Implementation only. Extends Sprint 3 tasks with completion state and `/todo` filtering syntax.

---

## 1. Hypothesis
> A user can retrieve active tasks and toggle their completion status in under 150ms directly from the command palette using a `/todo` query filter and keyboard shortcuts.

---

## 2. Sprint Goal
Add a `completed` column to the database captures table. Support query filtering via `/todo` (or `/tasks`) to search and display uncompleted tasks, and allow toggling their status on Enter.

```
Alt+Space → palette appears → type "/todo" → list of uncompleted tasks appears → select task → Enter → toggled to completed (saved to SQLite) → palette closes
```

---

## 3. In Scope

| # | Capability | User-facing? |
|---|---|---|
| 1 | DB Schema update: add `completed` column (INTEGER default 0) to `captures` | Infrastructure |
| 2 | Command syntax `/todo` and `/todo <query>` to search only uncompleted tasks | Yes |
| 3 | Render checkboxes `[ ]` next to task items in the search results list | Yes |
| 4 | Pressing `Enter` on a selected task toggles its `completed` status in SQLite | Yes |

---

## 4. Explicitly Out of Scope
- A separate full planner view (Sprint 4 is palette-only).
- Reminders, due dates, or calendars.
- Task deletion from the database (tasks are marked completed, not deleted).

---

## 5. Functional Requirements
- **FR-1** — The database initialization script automatically runs a migration to add a `completed` column (`INTEGER NOT NULL DEFAULT 0`) to the `captures` table if it does not exist.
- **FR-2** — If the user types `/todo` (with or without subsequent query characters), only display matching captures where `type = 'task'` and `completed = 0`.
- **FR-3** — Render task items in the search results list with a visual checkbox indicator (e.g. `[ ]`).
- **FR-4** — Pressing `Enter` when a task item is highlighted toggles its database `completed` field (from `0` to `1` or vice-versa), updates the UI, and closes the palette.
- **FR-5** — All other command and capture behaviors (Quick Capture, plain text search, Esc close, blur dismiss) remain unaffected.

---

## 6. Non-Functional Requirements
- Task completion database update and window close: < 100ms.
- Toggle animation/transition: None (instant state check and close).

---

## 7. Definition of Done
- [ ] Database automatically migrates and adds the `completed` column on startup.
- [ ] Typing `/todo` displays up to 4 uncompleted tasks.
- [ ] Typing `/todo buy` filters uncompleted tasks matching the word "buy".
- [ ] Pressing `Enter` on a highlighted task updates the database row to `completed = 1` and closes the palette.
- [ ] Toggled tasks no longer appear when querying `/todo`.
