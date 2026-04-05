# Ronson Admin — CLAUDE.md

Admin dashboard for the Entune music curation platform. Manages clients, stores, audience profiles, reference track analysis, AI music generation (Suno), song libraries, playlists, and retail outcome analytics.

## Quick Reference

- **Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, TanStack React Query 5
- **Dev:** `npm run dev` (port 5173)
- **Build:** `npm run build` (tsc + vite, outputs to `dist/`)
- **Deploy:** Push to `main` triggers GitHub Actions → GitHub Pages
- **API:** `https://api.entuned.co` (env: `VITE_API_URL`), Bearer JWT auth from localStorage
- **Repo:** `https://github.com/danielfox296/ronson-admin.git` (separate repo, not a monorepo)

## Project Structure

```
src/
├── main.tsx                    # Entry: QueryClient (no retry, no refocus), global error toast
├── App.tsx                     # Routes + sidebar layout (172px fixed nav)
├── index.css                   # Design tokens (CSS vars), Tailwind base, dark theme
├── lib/
│   ├── api.ts                  # Fetch wrapper: api<T>(path, opts), uploadFile(file)
│   └── utils.ts                # humanize(), formatDuration()
├── components/
│   ├── Breadcrumb.tsx          # Nav breadcrumb trail
│   ├── StatusBadge.tsx         # Color-coded status pill (active/flagged/removed/etc)
│   ├── OutcomeScores.tsx       # Outcome strength sliders for a song (GET/PUT /api/songs/:id/outcome-scores)
│   └── FileUpload.tsx          # Drag-drop audio upload (mp3/wav/flac)
└── screens/
    ├── Login.tsx               # Email/password → localStorage.token
    ├── Dashboard.tsx           # Overview stats, live-now list (30s auto-refetch)
    ├── ClientList.tsx          # Search, filter, create clients
    ├── ClientDetail.tsx        # Edit client, create stores, manage corporate ICPs
    ├── StoreDetail.tsx         # Tabs: Audiences | Play Log | Ambient | Player Setup
    ├── AudiencePipeline.tsx    # Reference tracks: add/bulk-import/analyze/edit, songs per ICP
    ├── SunoCompose.tsx         # Compose from reference track: auto-generate prompt, upload audio
    ├── PromptComposer.tsx      # Freeform compose: cascading Client→Store→ICP→Track selectors, Suno submit
    ├── SongLibrary.tsx         # All songs: filter, search, upload, assign
    ├── SongDetail.tsx          # Song editor: title, status, flow factors, prompt, store assignments
    ├── CustomerProfiles.tsx    # All ICPs across clients, card grid, create new
    ├── BatchEntry.tsx          # 4-phase flow factor tagging with sliders + queue
    ├── OutcomesIntelligence.tsx # Flow factor × outcome correlation matrix
    ├── Config.tsx              # CRUD: flow factor configs, generation systems
    ├── Prompts.tsx             # CRUD: prompt templates (type-filtered)
    ├── Account.tsx             # Change password, logout
    └── analytics/              # Kraftwerk V2 — see analytics/ARCHITECTURE.md
        ├── index.tsx           # Shell: state, layout, section collapse
        ├── TopBar.tsx          # Store/date/baseline selectors
        ├── TogglePanel.tsx     # Left sidebar: factor checkboxes, confounder list
        ├── TimelineArea.tsx    # Shared X-axis, crosshair, tooltip coordination
        ├── HealthStrip.tsx     # Data completeness strip (15-min bins)
        ├── TrackLane.tsx       # Clickable track segments
        ├── FlowFactorLane.tsx  # Stepped line charts (up to 5 factors)
        ├── ConfounderLane.tsx  # Horizontal stacked bands
        ├── OutputLane.tsx      # Multi-line area chart + baseline overlay
        ├── DetailDrawer.tsx    # 31 flow factors + radar chart
        ├── AddConfounderModal.tsx
        ├── BottomBar.tsx
        ├── kraftwerk-data.ts   # Interfaces, mock data, flow factor schema
        ├── kraftwerk-hooks.ts  # TanStack Query hooks for analytics API
        └── kraftwerk-styles.css # Scoped dark styles (Inter + JetBrains Mono)
```

## Routes

```
/login
/dashboard
/analytics
/outcomes
/profiles
/clients
/clients/:id
/clients/:clientId/stores/:storeId
/clients/:clientId/stores/:storeId/audiences/:icpId
/clients/:clientId/stores/:storeId/audiences/:icpId/compose/:refTrackId
/songs
/songs/:id
/batch-entry
/compose
/config
/prompts
/account
```

All routes except `/login` are behind `RequireAuth` (checks `localStorage.token`, redirects to `/login` on missing/401).

## Design System

**CSS variables** defined in `src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#111117` | Page background |
| `--surface` | `#1b1b24` | Cards, panels |
| `--surface-2` | `#15151d` | Nested surfaces |
| `--border` | `rgba(255,255,255,0.09)` | Card borders |
| `--border-subtle` | `rgba(255,255,255,0.05)` | Dividers |
| `--text` | `rgba(255,255,255,0.87)` | Primary text |
| `--text-muted` | `rgba(255,255,255,0.65)` | Secondary text |
| `--text-faint` | `rgba(255,255,255,0.4)` | Tertiary/label text |
| `--accent` | `#5ea2b6` | Primary action color (teal) |
| `--accent-2` | `#70b4c8` | Hover state |

**Typography:** Inter (UI), JetBrains Mono (data values in analytics). Weights: 300/400/500/600.

**Patterns to follow:**
- Dark theme throughout — no light mode
- `bg-[#1b1b24] border border-[rgba(255,255,255,0.09)] rounded-xl` for card containers
- `text-[#5ea2b6]` for interactive links/buttons, `hover:text-[#70b4c8]`
- `text-[#ea6152]` for destructive actions (delete, remove)
- `text-[10px] font-bold uppercase tracking-widest` for section labels
- Inline hardcoded colors in Tailwind classes match the CSS vars (the codebase uses both interchangeably)
- Form inputs: `bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg`

**Analytics module** uses its own scoped styles in `kraftwerk-styles.css` under a `.kraftwerk` root class. Different color tokens — see `analytics/ARCHITECTURE.md`.

## API Patterns

All API calls go through `src/lib/api.ts`:

```typescript
// GET
const { data } = useQuery({ queryKey: ['key'], queryFn: () => api<{ data: T }>('/api/endpoint') });

// Mutation
const mutation = useMutation({
  mutationFn: (body) => api('/api/endpoint', { method: 'POST', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
});
```

**API response shape:** `{ data: T }` — always unwrap `.data`.

**File uploads** use `uploadFile(file)` which returns `{ url, file_id }`.

**Error handling:** Global toast in `main.tsx` via MutationCache `onError`. 401 → auto-logout.

### Key Endpoints

| Area | Endpoints |
|------|-----------|
| **Clients** | `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id` |
| **Stores** | `GET /api/stores`, `GET/PUT /api/stores/:id`, `POST /api/clients/:id/stores` |
| **ICPs** | `GET /api/store-icps`, `GET/PUT /api/store-icps/:id`, `POST/DELETE /api/stores/:id/icps` |
| **Ref Tracks** | `GET/POST /api/store-icps/:id/reference-tracks`, `POST .../bulk`, `GET/PUT/DELETE /api/reference-tracks/:id`, `POST /api/reference-tracks/:id/analyze` |
| **Songs** | `GET/POST /api/songs`, `GET/PUT/DELETE /api/songs/:id`, `GET /api/store-icps/:id/songs`, `GET/PUT /api/songs/:id/outcome-scores`, `GET /api/songs/:id/feedback` |
| **Playlists** | `POST /api/stores/:id/playlist`, `DELETE /api/stores/:id/playlist/:songId` |
| **Compose** | `POST /api/compose/generate`, `POST /api/compose/save`, `POST /api/compose/suno` |
| **Config** | `GET/POST/PUT/DELETE /api/flow-factors`, `/api/generation-systems`, `/api/prompts` |
| **Analytics** | `GET /api/analytics/:storeId/{timeline,outcomes,baseline,confounders,data-health}?date=`, `POST/DELETE confounders` |
| **Suno** | `GET /api/suno/token-status`, `POST /api/suno/refresh-token` |
| **Auth** | `POST /api/auth/login`, `POST /api/auth/change-password` |
| **Upload** | `POST /api/upload` (FormData) |

## Data Models

**Client** → has many Stores → each Store has many ICPs (audience profiles) → each ICP has Reference Tracks and Songs.

**Song** has: `title`, `status` (draft/generated/active/flagged/removed), `audio_file_url`, `duration_seconds`, `prompt_text`, `prompt_parameters` {style, style_negations, voice}, `flow_factor_values` (31 factors as JSON), `generation_system_id`, `lineage` {client, store, store_icp}, `store_playlists[]`, feedback[].

**ReferenceTrack** has: `title`, `artist`, `album`, `genre`, `bpm`, `musical_key`, `mode`, `production_era`, `instrumentation`, `vocal_tone`, `harmonic_sophistication`, `sonic_accessibility`, `suno_genre`, `tags[]`, `analysis_data` {notes, suno prompt data}, `analyzed` (boolean).

**Flow Factor** configs define 31 music attributes with `value_type` (numeric/scale/enum/text), range bounds, and options.

## Shared Components

| Component | Props | Notes |
|-----------|-------|-------|
| `Breadcrumb` | `items: {label, href?}[]` | Used in most screens |
| `StatusBadge` | `status: string` | Color map: active(green), flagged(amber), removed(red), etc. |
| `OutcomeScores` | `songId: string` | Self-contained query + edit mode. Used only in SongDetail |
| `FileUpload` | `onUploaded: (url) => void` | Drag-drop + click. Accepts mp3/wav/flac |

`AudiencePipeline.tsx` also defines a local `InlineEdit` component (click-to-edit text/textarea with blur-save) — reused across that screen for editable fields.

## Conventions

- **State management:** React Query for server state, useState for local UI. No Redux, no Context (except QueryClient).
- **Query invalidation:** Always invalidate related queries in mutation `onSuccess`.
- **Styling:** Tailwind utility classes with hardcoded color values. No component library.
- **CSS scoping:** Global styles use `#root` selector. Analytics uses `.kraftwerk` root. Never use bare element selectors or `!important`.
- **Shared components:** Check `src/components/` before creating inline duplicates (StatusBadge was extracted after being duplicated 5x).
- **File structure:** One screen per route. Complex features get a subdirectory (e.g., `analytics/`).
- **Commit style:** Imperative subject line, bullet points for changes.

## Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) → `npm ci && npm run build` → GitHub Pages.

`VITE_API_URL` is set via GitHub Actions secret. The `index.html` includes a SPA redirect script for GitHub Pages hash routing.

## Related Projects

These are **separate git repos** in the same parent directory (`/Users/fox296/Desktop/entuned/`):

- **entune-api** — Backend API (Express/Prisma). All `/api/*` endpoints.
- **wonder-player** — Customer-facing music player (port 5174)
- **website** — Marketing site (has its own CLAUDE.md)
