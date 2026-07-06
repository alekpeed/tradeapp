# TradeApp

A Windows desktop app for tracking trades across stocks, crypto, bonds,
commodities, and custom assets in one place — including old/legacy history —
with automatic profit/loss and PDF export.

See [`DESIGN.md`](./DESIGN.md) for the full design write-up (data model,
feature list, build order).

## Stack

Electron + React + TypeScript, with a local SQLite database (`better-sqlite3`)
— everything runs offline on the user's machine, no server required.

## Getting started

Requires Node.js 20+ and a normal internet connection (the first install
downloads Electron's prebuilt binary and compiles `better-sqlite3` against it).

```bash
npm install       # installs deps, downloads Electron, rebuilds better-sqlite3
npm run dev       # launches the app with hot reload
npm run typecheck # type-check main/preload/renderer
```

## Getting the Windows installer

**Easiest — let GitHub build it for you.** The
`.github/workflows/build-windows.yml` workflow builds the NSIS installer on a
real Windows runner. Trigger it from the repo's **Actions** tab ("Build
Windows installer" → "Run workflow"), or push a version tag like `v0.1.0`.
When the run finishes, download the `TradeApp-windows-installer` artifact —
the `.exe` inside is the installer.

**Or build locally on any Windows machine:**

```bash
npm install
npm run dist:win
```

Produces the same NSIS installer under `dist/`. The app icon lives at
`build/icon.ico` (multi-size, generated) with a 256px PNG alongside it.

## Where data lives

The SQLite database is created under the OS "app data" directory for the
app (on Windows: `%APPDATA%/tradeapp/tradeapp.db`). Back this file up (or use
the CSV/PDF export features) to keep a portable copy of her data.

## Project layout

```
src/main         Electron main process: SQLite schema, IPC handlers, lot-matching engine
src/preload      contextBridge API exposed to the renderer
src/renderer     React UI (Dashboard, Transactions, Instruments, Accounts, Import, Reports)
src/shared       TypeScript types shared between main/preload/renderer
```

## Documentation

- [`DESIGN.md`](./DESIGN.md) — architecture, data model, roadmap.
- [`USER_MANUAL.md`](./USER_MANUAL.md) — the full plain-English user manual.
  The same manual lives inside the app on the **Help** page, where it can be
  saved as a PDF with one click.

## Current feature set

- Instruments: stocks, ETFs, mutual funds, bonds, crypto (top-100 seeded),
  commodities, forex, options, futures, REITs, cash, and fully custom tickers.
- Accounts with a configurable cost-basis method (FIFO/LIFO/average/specific lot).
- Manual transaction entry (buy/sell/dividend/interest/split/transfer/fee/etc.)
  with automatic lot creation and lot-matching on sells, producing realized
  gain/loss records with short/long-term holding-period classification.
- CSV import wizard with column mapping and a preview step before committing —
  plus paste-rows-from-a-spreadsheet as an alternative to a file.
- Manual "legacy opening position" entry for old holdings where only a
  year-end balance is known (flagged as estimated cost basis).
- Stock splits: the `split` transaction type scales open-lot quantities and
  per-unit basis by the ratio (reverse splits via fractional ratios).
- Wash-sale warnings: loss-sales with a repurchase within ±30 days are flagged
  ⚠️ on Reports (and in the PDF), with a heads-up when recording the buy.
- Dashboard with open positions, allocation chart by asset type, realized
  gain-by-year chart, and realized gain/loss totals (all-time and YTD).
- PDF export (via Electron's native `printToPDF`) for realized gains,
  current positions, any date range of transactions, and the user manual.
- Manual "current price" entry per instrument, driving market value and
  unrealized gain columns/totals on the dashboard.
- 20 color themes (12 light, 8 dark) and 4 layouts (classic sidebar, compact
  icon sidebar, top bar, and a large-text "Big & Simple" mode with a
  big-button Home screen), all switchable live from the Settings page.
- In-app Help page containing the complete step-by-step manual.

## Not yet built (see DESIGN.md §6 for the full idea list)

- PDF/OCR ingestion of scanned statements (CSV import and manual entry cover
  old trades today; document OCR staging is the next tier).
- Live price feeds for unrealized P&L (manual price entry on the dashboard
  covers this today).
- Mergers/spin-offs/ticker changes (splits are handled; other corporate
  actions still need manual correcting entries).
- Multi-currency FX conversion (schema fields exist; app is USD-first today),
  dividend reinvestment automation.
