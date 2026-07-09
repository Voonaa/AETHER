# AETHER — Product Bible (Condensed)
### An Ambient Productivity Layer for the Desktop

---

## 1. Vision, Mission, Values

**Vision:** A desktop where your tools stop asking for attention and start earning trust — surfacing the right thing at the right moment, then getting out of the way.

**Mission:** Give people one calm, fast, keyboard-first home for capture, focus, and recall — replacing five open apps and a dozen browser tabs with a single ambient layer that lives on top of Windows.

**Values:**
- **Speed is a feature, not an optimization.** If it's not instant, it's broken.
- **Silence over noise.** Every notification must justify its interruption.
- **Local-first, trust-first.** Your data is yours; the cloud is optional, not load-bearing.
- **Depth without clutter.** Power users get power; everyone else never sees it.

**Honest note up front:** "Ambient Productivity Operating System" is marketing language, not a real OS layer — it's a Windows utility (widgets + launcher + notes + AI), similar in spirit to Raycast/PowerToys. I'll use the category language where useful for positioning, but the architecture and roadmap below treat it as what it actually is, because overclaiming here would set the wrong engineering expectations.

---

## 2. Category & Positioning

**Category claim:** "Ambient productivity" is a real, useful positioning wedge — but it's not empty of competitors. Raycast (macOS-first), PowerToys, and Windows Widgets already occupy pieces of it. The honest pitch isn't "brand-new category," it's: **the first tool that merges launcher + notes + planner + AI into one persistent, always-available layer on Windows**, where today users stitch together 3-4 separate apps.

**Positioning statement:** For Windows power users who juggle notes, tasks, and quick lookups across too many apps, Aether is an always-on desktop companion that unifies capture, search, and planning in one instant interface — unlike Notion or Obsidian, it isn't a destination app you visit, it's a layer that's always there.

---

## 3. Competitive Analysis

| Product | Strength | Gap Aether exploits |
|---|---|---|
| Raycast | Blazing launcher, great extension ecosystem | Mac-only; not a notes/planning home |
| Notion | Powerful structured docs | Slow, heavy, requires visiting a browser tab |
| Obsidian | Great local notes, plugin depth | No launcher, no ambient presence, steep setup |
| Todoist | Clean task model | Task-only, no notes/capture |
| PowerToys | Deep Windows integration, free, MS-trusted | Utility-grade, not a cohesive product experience |
| Windows Widgets | Native, ambient | Shallow, ad-laden, not extensible |

**Real risk:** Microsoft can ship a good version of this natively at any time (they've tried with Widgets, Loop, Copilot). Aether's defensibility has to be speed, taste, and local-first trust — not feature surface area, which Microsoft will always out-resource us on.

---

## 4. SWOT

- **Strengths:** Clear wedge (unify 3+ habits into 1), keyboard-first speed, local-first privacy story.
- **Weaknesses:** Small team can't out-build Notion/Microsoft on breadth; "does everything" scope risk (see Feature section — most of the original 30-feature list should be cut).
- **Opportunities:** Windows has no strong native Raycast-equivalent; AI-native positioning while incumbents bolt AI on.
- **Threats:** Microsoft Copilot integration into Windows shell; scope creep killing the "instant" promise; user trust in a new app touching clipboard/notes data.

---

## 5. Blue Ocean Strategy

Instead of competing on feature count (a losing game against Notion/Microsoft), compete on **latency and restraint**: eliminate features rather than add them. The wedge is "the tool that does less, faster, and is always one keystroke away." Reduce, don't expand, the original feature list.

---

## 6. Jobs To Be Done

1. "When an idea hits me, I want to capture it in under 2 seconds without breaking flow."
2. "When I need a file/app/note, I want to find it without remembering where I put it."
3. "When I sit down to work, I want to see what matters today without opening 5 apps."
4. "When I'm deep in focus, I don't want anything to interrupt me — but I still want reminders to land later."

---

## 7. Personas (trimmed to 3 — not 10)

- **Dana, software engineer:** Lives in the keyboard, hates mice and modals, wants a launcher + snippet manager + quick notes. Success = never touching the trackpad for capture.
- **Priya, freelance designer/PM hybrid:** Juggles client notes, todos, and a loose calendar. Wants one calm daily view, not a project-management suite.
- **Sam, student:** Wants a lightweight planner + note capture during lectures, zero setup, free tier.

(Cutting gamers/data scientists/managers/office-workers from the original 10 — a v1 product built for everyone is built for no one.)

---

## 8. User Journey (core loop)

1. **Trigger:** Global hotkey (e.g. `Alt+Space`) from anywhere in Windows.
2. **Capture or Command:** Type a note, a task, or a command — same box, disambiguated by simple syntax (`/task`, `/note`, or nothing = quick capture).
3. **Instant close:** Palette closes in <100ms after action; no modal, no save button.
4. **Ambient surfacing:** A minimal desktop widget shows today's 3-5 relevant items — not a dashboard, a glance.
5. **Recall:** Universal search (`Alt+Space` + typing) finds anything in <150ms via local index.

---

## 9. Feature Tree — Cut Ruthlessly

The original brief lists ~35 features (clipboard manager, snippets, bookmarks, journal, voice notes, pomodoro, timeline, statistics, plugins, etc.). Shipping all of this in v1 is the single biggest risk to the product. Recommended cut:

**v1 (ship this, nothing else):**
- Global command palette / quick capture
- Notes (markdown, local-first)
- Tasks + simple daily planner
- Universal search (notes, tasks, files, apps)
- One ambient desktop widget (today view)
- Focus mode (does-not-disturb, not full pomodoro suite)

**v2 (after v1 has real usage data):**
- AI assistant (summarize, organize, draft) — see AI section
- Snippet manager, clipboard history
- Templates, basic calendar view

**Backlog / maybe never:**
- Plugins, voice notes, statistics/timeline, journal, bookmarks manager, countdown, workspaces — these are separate products bolted on. Each one added pre-PMF dilutes the "instant, calm" promise the whole pitch depends on.

---

## 10. Information Architecture

```
Global Hotkey → Command Palette (the front door)
   ├── Quick Capture (default action)
   ├── Search (notes / tasks / apps / files)
   ├── Commands (create task, open note, start focus)
   └── AI (v2, invoked explicitly, never ambient-intrusive)

Desktop Widget (persistent, dismissible)
   └── Today: 3-5 tasks, 1-line note preview, focus toggle

Full Window (opened rarely, for deep work)
   ├── Notes (list + editor)
   ├── Planner (day/week)
   └── Settings
```

The "full window" should be the least-used surface. If users live there, the palette/widget loop has failed.

---

## 11. Wireframe Concepts (described)

**Command palette:** Centered floating bar, ~600px wide, translucent dark surface, single input line, 3-4 contextual results below, no chrome, closes on `Esc` or action.

**Desktop widget:** Rounded rectangle, ~280x180px, corner-docked, semi-transparent, shows date, 3 tasks with checkboxes, one-line "last note," small focus-mode toggle. No scrolling, no tabs — if content doesn't fit, it's not shown.

**Full window:** Two-pane layout — left rail (Notes/Planner/Search), right content pane. No third pane, no nested sidebars.

---

## 12. Interaction & Motion Design

- Palette open/close: 120ms ease-out scale+fade — fast enough to feel instant, not so fast it feels like a glitch.
- Task complete: quick checkmark + strike-through, no confetti/rewards animation — the original brief's "every completion rewards the user" is worth pushing back on. Reward animations on every checkbox click get annoying by day three; save delight for rare milestones, not routine actions.
- Widget updates: cross-fade, never a hard refresh/flicker.
- No sound by default (see Notification Philosophy).

---

## 13. Design System (essentials)

- **Color:** Neutral dark/light base (near-black #0E0E10 / near-white #FAFAFA), single accent color user-selectable, translucency used sparingly (widget + palette only, not everywhere — glassmorphism on every surface reads as dated, not premium).
- **Typography:** One UI font (Inter or Windows' own Segoe UI Variable for native feel), one mono font for code/snippets. Two weights max in UI chrome.
- **Icons:** Single consistent icon set (Lucide-style), no mixed icon languages.
- **Accessibility:** Full keyboard navigation (non-negotiable given the keyboard-first premise), WCAG AA contrast minimum, screen-reader labels on all interactive elements, respects Windows high-contrast mode.

---

## 14. Architecture Recommendation

**Tauri over Electron.** Electron's RAM/startup cost directly contradicts the "instant, low-RAM, native-feeling" goals stated in the brief — you cannot claim both "feels like Windows itself" and ship a 150MB+ RAM Chromium shell for a notes+launcher app. Tauri (Rust core + system webview) gets close to native startup and memory footprint at the cost of some ecosystem maturity, which is an acceptable tradeoff for this product's goals.

**Frontend:** React is fine — Svelte is marginally faster but the difference is irrelevant next to the Electron/Tauri choice, and React's ecosystem/hiring pool is a real advantage for a small team.

**Database:** SQLite, local-first, single file, with an optional sync layer (not baked into core reads/writes) for v2 cloud sync. JSON files don't scale past a few hundred notes/tasks without becoming a performance and corruption risk.

**State management:** Lightweight (Zustand-equivalent) over Redux — this app's state graph doesn't need Redux's ceremony.

**IPC:** Tauri's built-in command/event system; keep the Rust core owning the SQLite connection, frontend never touches the DB directly.

**Sync:** Defer to v2. Shipping sync in v1 multiplies complexity (conflict resolution, auth, backend hosting) before there's product-market fit to justify it.

**Local AI vs Cloud AI:** Start cloud-API-based (Claude/GPT via API) for AI features — local models capable enough for good summarization/organization still cost meaningful RAM/CPU on average hardware in 2026, which fights the "low RAM, native feeling" goal. Revisit local inference once a feature clearly needs offline AI.

---

## 15. Security & Privacy

- Local-first by default: no account required to use core features.
- If cloud sync ships (v2), end-to-end encryption for note/task content, not just transport encryption.
- Clipboard manager (if ever built) is a real privacy liability — passwords and secrets pass through clipboards constantly; would need explicit exclusion rules and a short retention window by default.
- AI features (v2): explicit opt-in per action, not always-on background scanning of notes.

---

## 16. Performance Targets (concrete, not just adjectives)

- Cold start to palette-ready: <300ms
- Palette open (hotkey to visible): <100ms
- Search results: <150ms for a 10k-note local index
- Idle RAM: <100MB (this is the real test of the Tauri decision)
- Idle CPU: ~0%

---

## 17. AI Philosophy & Architecture (v2)

Agree with the brief's instinct: AI here should be invoked, not ambient/always-watching. Concretely:
- AI triggered explicitly (`/summarize`, `/plan-my-day`), never auto-injecting suggestions into the UI unprompted.
- Context passed = only what's needed for that action (the note being edited, today's tasks) — not the whole database, for both privacy and latency reasons.
- No "AI wrote this for you" silent edits — AI output is always a proposal the user accepts or discards.

---

## 18. Notification Philosophy

Default state: **zero notifications.** Reminders the user explicitly sets are the only interruptions. No engagement-driven nudges ("you haven't opened Aether today!"), no streaks, no red badges for their own sake. This directly contradicts "every completion rewards the user" from the original brief — reward mechanics are a retention-gaming pattern borrowed from consumer apps, and they cut against the "calm tool" positioning this product is actually going for.

---

## 19. Roadmap

- **v1 (3-4 months):** Palette, notes, tasks, search, one widget, focus mode. Ship to a small beta, measure daily-open rate and palette-invocations/day as the core health metrics.
- **v2 (+3 months):** AI assist, snippets/clipboard, calendar view, optional cloud sync.
- **v3+:** Plugin API — only once v1/v2 usage patterns reveal what third parties would actually build.

---

## 20. Business Model

Free core (palette + notes + tasks + search, local-only) to build habit and word-of-mouth; paid tier (~$6-8/mo) unlocks cloud sync + AI features, where the marginal cost (API calls, hosting) actually lives. This avoids charging for the free, local-only core that costs nothing to serve — the sustainable version of "student-friendly + commercial" from the original brief.

---

## 21. Brand

Name: **Aether** — evokes "the medium that's everywhere," fits the ambient positioning without overclaiming a new OS. Logo: a simple geometric mark (a soft ring or dot, echoing the palette's shape) rather than a mascot — a mascot fights the "calm, gets out of your way" premise; skip it. No sound design by default, consistent with the no-noise notification stance; one optional subtle capture-confirm sound, off by default.

---

## 22. Success Metrics

- Palette invocations per active user per day (primary — measures whether it's actually becoming ambient/habitual)
- D7/D30 retention
- Time from hotkey to captured item (latency, not just satisfaction survey)
- % of users who never open the "full window" (higher = the ambient loop is working)

## 23. Risk Analysis

- **Scope creep** is the top risk — the original 35-feature list, if built, delays launch past the point where speed/taste differentiation still matters.
- **Microsoft shipping this natively** is a real platform risk with no full mitigation beyond taste and speed.
- **Trust risk** from any app sitting in the clipboard/notes path — needs transparent, auditable data handling from day one.

## 24. Testing & Deployment

Closed beta (100-200 keyboard-heavy users: engineers, students) before public launch; instrument palette latency and daily invocations from day one, not just crash telemetry. Ship via a signed installer + auto-update; no Windows Store dependency for v1 to avoid review-cycle drag on rapid iteration.

---

## Self-Critique

The original brief's biggest risk to the actual product is the brief itself: 35 features, 10 personas, "every animation must create delight," "every completion rewards the user," full offline+cloud+local-AI+plugin architecture — all specified as if v1. Built as written, this becomes Notion-with-extra-steps: slow, cluttered, un-shippable in a reasonable timeframe, and contradicting its own "instant, minimal, calm" values. The version above cuts scope hard on purpose — 6 features in v1, 3 personas, no mascot, no reward animations, no clipboard manager at launch — because the actual differentiator (speed + restraint) is undermined by everything the original list adds. If you want, I can go deeper on any single section next — the architecture, the v1 feature specs, or the visual design system — with real detail instead of this condensed pass.
