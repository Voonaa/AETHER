# 02 — Architecture and Decisions
### Aether — Sprint 1 Baseline

**Status:** Frozen once approved. Extends only when a new sprint genuinely requires it (see Section 8).
**Scope discipline:** This document describes the architecture needed for one window, one hotkey, one text input, one SQLite table. It does not pre-build structure for features that don't exist yet.

---

## 1. Architecture Overview

Aether Sprint 1 is a single Tauri application with two halves:

```
┌─────────────────────────────┐
│   React (frontend/webview)   │  ← presentation only
│   - Palette component        │
└──────────────┬────────────────┘
               │ Tauri IPC (commands/events)
┌──────────────┴────────────────┐
│   Rust (Tauri core)           │  ← everything else
│   - Hotkey registration       │
│   - Window management         │
│   - SQLite access             │
└─────────────────────────────┘
```

React never talks to SQLite. It calls one Tauri command (`save_capture`) and gets a result back. This isn't a rule bolted on for discipline — it's how Tauri works; the webview has no filesystem/DB access by design.

---

## 2. Folder Structure (Sprint 1 only)

```
aether/
├── src/                      # React frontend
│   ├── Palette.tsx            # the entire UI for Sprint 1
│   ├── main.tsx
│   └── store.ts               # Zustand, palette open/close state only
├── src-tauri/                 # Rust core
│   ├── src/
│   │   ├── main.rs
│   │   ├── hotkey.rs           # Alt+Space registration
│   │   ├── db.rs               # SQLite connection + one repository fn
│   │   └── commands.rs         # save_capture command
│   ├── migrations/
│   │   └── 001_init.sql        # captures table
│   └── Cargo.toml
└── docs/                      # this doc, SRS, bible, backlog
```

No `features/` directory, no `modules/`, no `services/` layer yet — there is exactly one feature. Introducing a modular structure now means guessing at boundaries for capabilities that don't exist. That guess will be wrong and get refactored anyway; better to let Sprint 2/3 introduce structure when there's a second capability to draw a boundary against.

---

## 3. Module Boundary (Sprint 1)

Only two boundaries exist, and they're the same boundary Tauri enforces by default:

- **React owns presentation.** It renders the input, handles keystrokes, calls `invoke('save_capture', { text })`.
- **Rust owns persistence and OS integration.** Hotkey registration, window show/hide, SQLite writes.

There is no event bus, no dependency injection container, no repository *pattern* abstraction yet — there's one repository *function*. Formal patterns earn their place when there's more than one thing to abstract over.

---

## 4. Technology Stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand (one boolean: `isPaletteOpen`) |
| Backend | Rust (Tauri core) |
| Database | SQLite |
| Build | Vite |

Not included yet, on purpose: TanStack Query (nothing to fetch/sync until there's a network layer), any ORM (one table, raw SQL via `rusqlite` is simpler than an abstraction layer for one query).

---

## 5. Architecture Decisions

**ADR-001 — Tauri over Electron**
Electron's memory/startup footprint directly contradicts the product's core promise (instant, low-RAM, native-feeling). Tauri's Rust core + system webview gets close to native performance at the cost of some ecosystem maturity — an acceptable tradeoff given the product's central bet is speed.
Status: Accepted

**ADR-002 — SQLite over JSON files**
JSON files don't scale past a few hundred entries without becoming a corruption/performance risk, and offer no query capability for the search feature planned in a later sprint. SQLite is a single local file, zero server, and gives us a real query layer for free later.
Status: Accepted

**ADR-003 — React + Zustand over Redux**
This app's state graph is trivial in Sprint 1 (one boolean) and won't grow to Redux-justifying complexity for several sprints. Zustand avoids ceremony without foreclosing a move to something heavier later if state genuinely grows complex.
Status: Accepted

**ADR-004 — Alt+Space as the default hotkey**
Matches the mental model of existing launchers (Spotlight, Raycast, PowerToys Run), reducing the learning curve to zero. Must remain user-remappable in a later sprint (not Sprint 1) since Alt+Space conflicts with some window managers/IMEs.
Status: Accepted

**ADR-005 — No ORM in Sprint 1**
One table, one query. An ORM adds a dependency and an abstraction layer to learn/maintain for less code than writing the SQL directly. Revisit if the schema grows past ~3-4 tables.
Status: Accepted

---

## 6. Engineering Rules (Sprint 1 scope)

These apply now, because they constrain code being written this sprint:

1. UI never touches SQLite directly — enforced by Tauri's architecture, restated here so it's explicit for whoever implements.
2. Rust owns persistence; React owns presentation.
3. No dependency is added without a one-line justification in this doc (see stack table above as the model).
4. The palette's hotkey→visible and Enter→saved paths must never await anything that can block >100ms (no synchronous disk operations on the UI thread beyond the single save call).

**Deferred, not deleted** — these become relevant once Sprint 2+ introduces a second module or feature, and should be added to this doc *then*, not now:
- Module/feature boundary rules (e.g. "Palette never imports Feature modules") — meaningless until a second module exists.
- Formal Repository *pattern* — one function is not a pattern yet.
- Event bus — nothing to route events between yet.

---

## 7. Coding Standards (minimal, Sprint 1)

- **Naming:** `snake_case` in Rust, `camelCase` in TypeScript — each language's convention, not a forced shared standard.
- **Errors:** Rust commands return `Result<T, String>`; frontend surfaces failures by simply not closing the palette (no toast/dialog system yet — that's a Sprint 2+ concern).
- **Logging:** `println!`/`console.log` during Sprint 1 is fine. A real logging setup is deferred until there's more than one code path to debug.

Full coding standards (formatting rules, commit conventions, git strategy) are deferred — writing a style guide for a ~200-line codebase is the same over-documentation trap this doc is trying to avoid.

---

## 8. Future Extension Points (no implementation)

Named so Sprint 2+ knows where to look, not built now:

- **Search (Sprint 2):** SQLite already supports this via a query — likely FTS5 virtual table, decided when Sprint 2 starts.
- **Multiple capture types (Task, Note) (Sprint 3+):** will need a `type` column and a first real module boundary — this is where `features/` folders and the deferred rules in Section 6 get introduced.
- **AI (Sprint 4+):** will need an explicit invocation boundary (button/command, not ambient) — architecture for this is written when Sprint 4 starts, not before.

This document grows when one of these becomes the current sprint's work — not in anticipation of it.
