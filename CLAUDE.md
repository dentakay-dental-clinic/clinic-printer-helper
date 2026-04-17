# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Next.js dev server → http://localhost:3000
npm run build        # Static export to /out/ (required before Tauri build)
npm run lint         # ESLint

npx tauri dev        # Desktop app in dev mode (auto-runs npm run dev)
npx tauri build      # Build desktop installer (auto-runs npm run build)
```

No test runner is configured.

## Architecture

**What it is:** A Tauri 2 desktop app (Next.js static export inside a WebView) for clinic front desk staff to print appointment labels on an Argox OS-214plus thermal label printer.

### Routing — `app/page.tsx`
Smart router that redirects on load:
- No config → `/setup`
- Config + PIN enabled + not unlocked → `/lock`
- Otherwise → `/appointments` (main UI)

### State — two React Context providers
- `ClinicConfigContext` (`contexts/ClinicConfigContext.tsx`) — wraps the entire app in `layout.tsx`. Holds clinic settings (ID, name, API URL, PIN, default print quantity). Backed by `store/ConfigStore.ts` (localStorage, with a clear swap path to `tauri-plugin-store`).
- `AppointmentsContext` (`contexts/AppointmentsContext.tsx`) — wraps the `/appointments` page. Manages the appointments list, all filter state (quick time, status, search), selection for bulk printing, and API fetching.

### API — `services/api.ts` + `services/appointmentsApi.ts`
Lightweight fetch wrapper that injects `X-API-KEY`. Env vars: `NEXT_PUBLIC_API_KEY`, `NEXT_PUBLIC_API_BASE_URL` (default: `https://ms-integration-api.dentakay.com/api/v1`).

### Printing — `services/WebPrinterService.ts`
Implements `IPrinterService` (defined in `services/PrinterService.ts`). On `print()`:
1. Builds label HTML strings for each patient × quantity
2. Injects into `#print-area` div (always present in `layout.tsx`, hidden normally)
3. Calls `window.print()` → OS print dialog → Argox driver handles the rest
4. Cleans up the div

**Label dimensions** are set in `app/globals.css` `@page { size: 50mm 30mm }` — update this after measuring the physical label roll at the clinic.

### Static export requirement
`next.config.ts` has `output: "export"` and `trailingSlash: true`. These are required for Tauri to serve files from `/out/`. Do not remove them.

### Path alias
`@/` maps to the repo root (configured in `tsconfig.json`).
