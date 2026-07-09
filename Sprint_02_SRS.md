# Sprint 02 — Software Requirements Specification
### Aether — Universal Search & Retrieval

**Status:** Draft, pending Founder approval
**Governs:** Implementation only. Extends Sprint 1 capture loop with search capabilities.

---

## 1. Hypothesis
> A user can retrieve any past captured thought in under 150ms directly from the command palette using keywords, copying it to their clipboard without breaking flow.

---

## 2. Sprint Goal
Extend the command palette to display a list of relevant past captures as the user types, allowing them to search, select with keyboard arrows, and copy to clipboard on Enter.

```
Alt+Space → palette appears → type query → search results appear below → Up/Down arrows to select → Enter → copied to clipboard & palette closes
```

---

## 3. In Scope

| # | Capability | User-facing? |
|---|---|---|
| 1 | SQLite FTS5 integration for fast keyword queries | Infrastructure |
| 2 | UI results list (contextual list of up to 4 items below input) | Yes |
| 3 | Up/Down arrow key navigation to select items in the list | Yes |
| 4 | Enter on selected item copies its text to clipboard and closes the palette | Yes |
| 5 | Enter on non-selected item performs Quick Capture (saves input and closes) | Yes |

---

## 4. Explicitly Out of Scope
- Editing or deleting past captures inside the palette window.
- Filtering by date or tag.
- AI search or semantic search (Sprint 2 uses SQLite FTS5 text search only).
- Scrollbars or pagination (limit to 4 results max).

---

## 5. Functional Requirements
- **FR-1** — As the user types, the palette queries SQLite using FTS5 match queries.
- **FR-2** — Display up to 4 matching results in a list below the input box.
- **FR-3** — If the input is empty, the results list is hidden.
- **FR-4** — Pressing `Down` highlights the first search result. Subsequent `Down`/`Up` presses cycle selection.
- **FR-5** — Pressing `Enter` when a search result is highlighted copies its text to the clipboard and closes the palette.
- **FR-6** — Pressing `Enter` when no result is highlighted saves the typed input as a new capture and closes the palette (maintaining Sprint 1 capture behavior).

---

## 6. Non-Functional Requirements
- Search query → results rendered: < 150ms.
- Input focus lag: None.
- Flicker or layout jump on results list expansion: None (smooth fade-in or instant display).

---

## 7. Definition of Done
- [ ] Typing immediately triggers query and displays up to 4 matches.
- [ ] Keyboard navigation (`Up`/`Down`) smoothly cycles selections.
- [ ] Pressing `Enter` on a selected result copies text to Windows clipboard and closes the window.
- [ ] Quick Capture remains functional (Enter saves new text if no result is highlighted).
- [ ] Search query returns results in under 150ms.
