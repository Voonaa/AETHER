# 04 — Future Wow Features
### Aether — Post-PMF Backlog

**Purpose:** Hold ideas that are good but not now. Nothing here is rejected — it's sequenced. Nothing in this document may be pulled into a sprint without Founder sign-off, and only after the current sprint's hypothesis is validated.

**Rule:** If Antigravity AI (or any future contributor) proposes a new capability during implementation, it goes here — not into the current sprint.

---

## Deferred from product discussion

**Adaptive Widget**
Widget content changes based on time of day (morning: today's focus / midday: next meeting / evening: review). Interesting, but Sprint 1 doesn't have a widget at all yet — this is at minimum two sprints out (widget exists, then widget adapts).

**Memory / Context Engine**
App learns usage patterns (e.g. opens VS Code + Spotify + GitHub every morning) and pre-opens a "workspace" without being asked. Directly in tension with the product principle "AI is invoked, never ambient" — would need explicit product reconsideration of that principle before being scoped, not just an engineering estimate.

**AI Workflow Generator**
Typing a goal (e.g. "Build Laravel API") auto-generates a checklist, timeline, folder, and repo. High complexity, high risk of feeling presumptuous/wrong. Needs the invoked-AI foundation (Sprint 4) built and validated first.

**Plugin SDK**
Third-party extensibility, VS Code-style. Needs a stable module boundary to extend against — premature before Sprint 3+ establishes what a "module" even is in this codebase.

**Cloud Sync / Multi-device**
Deferred until local-first v1 has real usage data justifying the backend cost and complexity (auth, conflict resolution, hosting).

**Mobile companion**
Not evaluated at all yet — no architecture decision has been made about whether this is a native app, a web view, or out of scope permanently.

**Context Awareness (auto-detect active app, e.g. VS Code → "Coding Workspace" mode)**
Same tension as Memory Engine — ambient behavior conflicts with the invoked-AI principle. Worth revisiting as a product discussion, not an engineering task.

**Calendar, Kanban, Timeline, Statistics, Journal, Voice Notes, Bookmarks**
From the original feature list. Not rejected, just not differentiating enough to justify complexity before the core capture loop is proven.

---

## How items leave this document

An item moves from here into an active sprint only when:
1. The current sprint's hypothesis has been validated (per its SRS's Definition of Done), and
2. The Founder explicitly selects it for the next sprint, and
3. It gets its own SRS, scoped as narrowly as Sprint 1's.

Nothing here is scaffolded, stubbed, or architected for in advance.
