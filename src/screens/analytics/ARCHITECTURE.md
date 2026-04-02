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
