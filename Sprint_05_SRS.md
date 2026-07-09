# Sprint 05 — Software Requirements Specification
### Aether — Ambient Desktop Widget (Today View)

**Status:** Draft, pending Founder approval
**Governs:** Implementation only. Introduces the persistent, frameless, translucent Desktop Widget.

---

## 1. Hypothesis
> A user can glance at their desktop to review the current date, their top 3 pending tasks, and their most recent quick-captured note in under 50ms without opening the main launcher.

---

## 2. Sprint Goal
Add a secondary transparent, frameless Tauri window representing the Desktop Widget. Configure layout routing in React, query SQLite for the widget content (date, 3 active tasks, last quick note), and render it corner-docked.

---

## 3. In Scope

| # | Capability | User-facing? |
|---|---|---|
| 1 | Secondary window configuration `"widget"` in `tauri.conf.json` | Infrastructure |
| 2 | Query routing in `main.tsx` (branch to `<Widget />` if `window=widget`) | Yes |
| 3 | Rust IPC command `get_widget_data` fetching date, top 3 active tasks, and latest note | Yes |
| 4 | Corner-docked, translucent dark card design (~280x180px) | Yes |
| 5 | Live interaction (checking off tasks from the widget auto-refreshes list) | Yes |

---

## 4. Explicitly Out of Scope
- Full focus-mode system execution (only UI toggle is added in Sprint 5, system actions deferred to Sprint 6).
- Desktop widget repositioning (widget coordinates are fixed or auto-docked at bottom-right/top-right by default).
- Support for multiple widgets.

---

## 5. Functional Requirements
- **FR-1** — The widget window is created at boot time, transparent, frameless (`decorations: false`), and loads index.html with query parameter `?window=widget`.
- **FR-2** — The Rust IPC endpoint `get_widget_data` returns:
  - Formatted date string (e.g. `Friday, July 10`).
  - Up to 3 active uncompleted tasks (`type = 'task' AND completed = 0` ordered by ID desc).
  - The latest saved note (`type = 'note'` ordered by ID desc).
  - Focus mode status (boolean).
- **FR-3** — Checking a task checkbox inside the widget calls `toggle_task_completion` and updates the widget list dynamically.
- **FR-4** — Visual presentation conforms to brand design (Neutral dark `#0E0E10/75`, backdrop-blur, subtle borders, outfit typography).

---

## 6. Non-Functional Requirements
- Widget redraw/cross-fade response time: < 50ms.
- Render footprint: extremely low RAM/CPU profile (persistent).

---

## 7. Definition of Done
- [ ] Launcher window (`Alt+Space`) and Desktop Widget coexist as independent windows.
- [ ] Widget renders date, 3 tasks with checkboxes, and the last note correctly.
- [ ] Toggling a task checkbox updates database immediately and clears it from the widget list.
- [ ] Widget is frameless and translucent, revealing desktop wallpaper behind it.
