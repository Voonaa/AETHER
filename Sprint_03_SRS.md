# Sprint 03 — Software Requirements Specification
### Aether — Multiple Capture Types (Note vs. Task)

**Status:** Draft, pending Founder approval
**Governs:** Implementation only. Extends Sprint 2 search and capture loop with type classification.

---

## 1. Hypothesis
> A user can classify a capture as a task or a note directly from the same input box using simple prefix commands (/task or /note), storing the type in SQLite without slowing down the capture motion.

---

## 2. Sprint Goal
Introduce a `type` column to the database captures table. Detect `/task ` and `/note ` prefixes in the command palette input box, strip the prefixes, and save the entries with the appropriate type.

```
Alt+Space → palette appears → type "/task Buy milk" → Enter → saved as "task" (text: "Buy milk") → palette closes
```

---

## 3. In Scope

| # | Capability | User-facing? |
|---|---|---|
| 1 | DB Schema update: add `type` column to `captures` table | Infrastructure |
| 2 | Command input syntax parser (detect `/task ` and `/note ` prefixes) | Yes |
| 3 | Strip command prefix before persisting the text | Yes |
| 4 | Support query filtering by type (optional search backend support) | Infrastructure |

---

## 4. Explicitly Out of Scope
- Task checkboxes or task completion status (deferred to Sprint 4).
- Inline task/note indicators in the search list (results still display as plain text matching captures).
- Interactive autocompletion for slash commands in the UI.

---

## 5. Functional Requirements
- **FR-1** — The database initialization script automatically runs a migration to add a `type` column (`TEXT NOT NULL DEFAULT 'note'`) to the `captures` table if it does not exist.
- **FR-2** — If the input starts with `/task ` (case-insensitive, followed by text), strip the prefix and write the entry to SQLite with `type = 'task'`.
- **FR-3** — If the input starts with `/note ` (case-insensitive, followed by text), strip the prefix and write the entry to SQLite with `type = 'note'`.
- **FR-4** — By default (no prefix, or any other prefix), save the entry with `type = 'note'`.
- **FR-5** — All captures (notes and tasks) continue to be indexed in FTS5 and appear in search results.

---

## 6. Non-Functional Requirements
- Input command syntax parsing and stripping: < 1ms.
- Persistent storage check and column migrations run: < 50ms on startup.

---

## 7. Definition of Done
- [ ] DB schema migrates automatically on startup without losing existing data.
- [ ] `/task Learn Rust` saves the text `Learn Rust` with type `task`.
- [ ] `/note Meet Dana` saves the text `Meet Dana` with type `note`.
- [ ] Submitting `Buy apples` defaults to type `note`.
- [ ] Captured items are searchable in the results list regardless of type.
