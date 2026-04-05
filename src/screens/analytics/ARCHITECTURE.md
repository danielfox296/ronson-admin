# Kraftwerk V1 — Architecture Reference

**Created:** April 2, 2026
**Replaces:** Ronson Analytics v2 (single-file Analytics.tsx + analytics-data.ts)
**Spec:** /Users/fox296/Downloads/kraftwerk-v1-spec.md

## How to Undo

To revert to Ronson Analytics v2:
1. `git log --oneline` — find the commit before "Kraftwerk" changes
2. `git revert <commit>..HEAD` or `git reset --hard <commit>`
3. The v2 code lived in two files: `src/screens/Analytics.tsx` (765 lines) and `src/screens/analytics-data.ts`
4. Backend: drop the `Confounder` and `RetailOutcome` tables, remove analytics routes from `entune-api/src/index.ts`
5. Run `npx prisma migrate dev` to reconcile

## File Map

```
ronson-admin/src/screens/
├── Analytics.tsx              # Re-export → ./analytics/index.tsx
└── analytics/
    ├── ARCHITECTURE.md        # This file
    ├── index.tsx              # Main shell — state, layout composition
    ├── TopBar.tsx             # Kraftwerk label, store/date/baseline selectors, status
    ├── TogglePanel.tsx        # Left sidebar: flow factor checkboxes, confounder list, output toggles
    ├── TimelineArea.tsx       # Shared X-axis container, vertical crosshair, tooltip coordination
    ├── HealthStrip.tsx        # 20px data completeness strip (15-min bins)
    ├── TrackLane.tsx          # 48px track segment blocks (clickable)
    ├── FlowFactorLane.tsx     # 180px stepped line chart (up to 5 factors)
    ├── ConfounderLane.tsx     # Variable-height stacking horizontal bands
    ├── OutputLane.tsx         # 220px multi-line area chart + baseline overlay
    ├── DetailDrawer.tsx       # 31 flow factors + 5-axis radar chart
    ├── AddConfounderModal.tsx # CRUD form for confounders
    ├── BottomBar.tsx          # Disclaimer + add confounder + export stub
    ├── kraftwerk-data.ts      # Interfaces, mock data, flow factor schema
    ├── kraftwerk-hooks.ts     # TanStack Query hooks for analytics API
    └── kraftwerk-styles.css   # Scoped styles (dark, Inter + JetBrains Mono)

entune-api/
├── prisma/schema.prisma       # +Confounder, +RetailOutcome models
└── src/routes/analytics.ts    # Timeline, outcomes, baseline, confounder CRUD
```

## State Architecture

All state lives in `index.tsx` and flows down via props:

```
selectedDate          → TopBar (display + navigation), all lanes (data filtering)
baselineMode          → TopBar (dropdown), OutputLane (overlay toggle)
selectedFlowFactors   → TogglePanel (checkboxes), FlowFactorLane (which lines to draw)
selectedOutputMetrics → TogglePanel (checkboxes), OutputLane (which lines to draw)
showBaseline          → TogglePanel (checkbox), OutputLane (ghost lines)
expandedSections      → TogglePanel (collapse/expand)
selectedTrackId       → TrackLane (highlight), DetailDrawer (content)
confounders           → TogglePanel (list), ConfounderLane (bands), AddConfounderModal (mutate)
hoverTime             → TimelineArea (crosshair X), all lanes (highlight + tooltip)
```

## Data Flow

```
PlayEvent (DB) ──→ GET /analytics/:storeId/timeline ──→ TrackLane + FlowFactorLane
Song.flow_factor_values (DB JSON) ──→ joined in timeline response ──→ FlowFactorLane + DetailDrawer
RetailOutcome (DB) ──→ GET /analytics/:storeId/outcomes ──→ OutputLane + HealthStrip
Confounder (DB) ──→ GET/POST/DELETE /analytics/:storeId/confounders ──→ ConfounderLane + TogglePanel
```

Until real POS data exists, RetailOutcome and baseline endpoints return mock data generated server-side.

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| bg | #0a0a0a | Page background |
| surface | #111111 | Cards, panels |
| border | #1e1e1e | Card borders, dividers |
| text | #d4d4d4 | Primary text |
| muted | #737373 | Secondary text |
| dim | #525252 | Labels, captions |
| sonic | #d4a843 | Track segments, flow factors |
| output-green | #22c55e | Conversion rate |
| output-blue | #3b82f6 | AOV |
| output-purple | #8b5cf6 | UPT |
| reference | #737373 | Traffic, dwell |

Fonts: Inter (UI), JetBrains Mono (data values, axes, tables)

## API Endpoints

All under `/api/analytics/:storeId/`

| Endpoint | Method | Auth | DB Tables | Status |
|----------|--------|------|-----------|--------|
| `/timeline?date=` | GET | JWT | PlayEvent + Song (join) | **Live** — reads real play events |
| `/outcomes?date=` | GET | JWT | RetailOutcome | **Mock fallback** — returns generated data if no DB rows |
| `/baseline?date=&mode=` | GET | JWT | RetailOutcome | **Mock only** — always generated data |
| `/confounders?date=` | GET | JWT | Confounder | **Live** — real CRUD |
| `/confounders` | POST | JWT | Confounder | **Live** |
| `/confounders/:id` | DELETE | JWT | Confounder | **Live** |
| `/data-health?date=` | GET | JWT | PlayEvent + RetailOutcome | **Live** (sonic), **Mock** (output) |

## Database Models (added by Kraftwerk)

```
Confounder         → manual entries, real from day 1
RetailOutcome      → 15-min bins, table ready for POS integration
```

Both have `store_id` FK to `Store` with cascade delete. Neither affects existing models.

## Evolution Roadmap

### What's mock → what becomes real

| Component | Current State | To Make Real | Where to Change |
|-----------|--------------|--------------|-----------------|
| Retail outcomes | Mock data generated in `analytics.ts` route | Connect RetailNext / POS system, write 15-min bins to `RetailOutcome` table | Backend: remove mock fallback in `/outcomes` endpoint |
| Baseline comparison | Mock data (±variance of outcomes) | Query `RetailOutcome` for the comparison period (last week / last year / 30-day avg) | Backend: real query in `/baseline` endpoint |
| Data health strip | Sonic = real, Output = mock | Output becomes real when RetailOutcome is populated | Automatic — `data-health` endpoint already checks both tables |
| Weather confounders | Manual entry | Auto-ingest from Open-Meteo API on a cron | Backend: new scheduled job, auto-create Confounder rows with type="weather" |
| Date navigation | Shows empty state for non-mock dates | Works automatically once real PlayEvents + RetailOutcome exist for multiple days | No change needed |

### Future features and where they go

| Feature | Spec Reference | Implementation Location |
|---------|---------------|------------------------|
| **Correlation model** | V1 spec §14 says explicitly deferred | New route: `/api/analytics/:storeId/correlation`. New component: `CorrelationPanel.tsx`. Add as a section below timeline or as a new tab. |
| **Lag/offset analysis** | V1 spec §14 defers but acknowledges value | Add `lag` query param to `/outcomes` endpoint. Shift outcome bins by N minutes. UI: slider in TopBar or TogglePanel. |
| **Multi-store view** | TopBar store selector is already a dropdown | Enable the `<select>` in TopBar.tsx. All hooks already accept `storeId` param — just stop hardcoding "pilot". |
| **Real-time WebSocket** | V1 spec §14 defers | New: WebSocket connection in `kraftwerk-hooks.ts`. Update `useTimeline` to merge WS events with query cache. `TrackLane` already handles "active" track pulse animation. |
| **Data export** | BottomBar has stub "Export Day" button | Implement CSV/JSON export of all timeline data for the selected date. Backend: `/api/analytics/:storeId/export?date=&format=csv`. |
| **Calendar popover** | TopBar has date arrows but no calendar | Replace text date display with a month-grid popover. Query `/data-health` for each date to show dot indicators on days with data. |
| **State scheduling** | Not in V1 scope | New model `StateSchedule`. New lane component between TrackLane and FlowFactorLane showing planned state windows. |
| **Miles integration** | Adaptive state recommendations | New section or overlay on FlowFactorLane showing "recommended" factor ranges based on outcome trends. Requires correlation model first. |

### Adding a new timeline lane

1. Create `NewLane.tsx` in `src/screens/analytics/`
2. Accept `hoverTime` prop for crosshair alignment
3. Render inside `TimelineArea.tsx` — add it to the lane stack
4. Position elements using `(minutesFrom9AM / 720) * containerWidth`
5. Add any toggle controls to `TogglePanel.tsx`
6. Add backend endpoint if lane needs new data
7. Add hook to `kraftwerk-hooks.ts`

### Adding a new output metric

1. Add to `OUTPUT_METRICS` array in `kraftwerk-data.ts` (key, label, color, defaultOn)
2. Add the field to `OutcomeBin` interface
3. Add the field to `RetailOutcome` Prisma model + migrate
4. Compute it in the `/outcomes` endpoint
5. `OutputLane.tsx` and `TogglePanel.tsx` pick it up automatically

### Adding a new flow factor

1. Add to `FLOW_FACTOR_SCHEMA` in `kraftwerk-data.ts`
2. Add values to each track in `TRACKS`
3. `TogglePanel.tsx` renders it automatically (if numeric type)
4. `FlowFactorLane.tsx` plots it automatically when selected
5. `DetailDrawer.tsx` shows it automatically in the full breakdown

## Key Decisions & Rationale

| Decision | Why |
|----------|-----|
| **Props-down state (no context/store)** | Single-user dashboard, ~10 state vars, no deep prop drilling beyond 2 levels. Context adds complexity without benefit here. |
| **Mock data in API routes, not frontend** | Frontend code is identical whether data is real or mock. Swap is backend-only. |
| **Scoped CSS file, not Tailwind** | Spec demands sharp instrument-grade aesthetic with specific pixel values. Tailwind arbitrary values would be less readable than plain CSS. All descendant selectors (e.g. `.kw-modal-field input`) are nested under `.kraftwerk` root to prevent bleed into non-analytics screens. |
| **15 files, not 1** | Approved by user. Each component is independently testable and replaceable. |
| **Confounder CRUD is real from day 1** | It's user-input data — no external system dependency. Persisting it immediately captures operational context that would otherwise be lost. |
| **RetailOutcome table created but empty** | Schema is production-ready for POS integration. Mock fallback in the route means the UI works immediately. |
