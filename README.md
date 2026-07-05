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

## Building the Windows installer

```bash
npm run dist:win
```

Produces an NSIS installer under `dist/`. Add a `build/icon.ico` before
shipping if you want a custom app icon (electron-builder falls back to a
default Electron icon otherwise).

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

## Current feature set

- Instruments: stocks, ETFs, mutual funds, bonds, crypto (top-100 seeded),
  commodities, forex, options, futures, REITs, cash, and fully custom tickers.
- Accounts with a configurable cost-basis method (FIFO/LIFO/average/specific lot).
- Manual transaction entry (buy/sell/dividend/interest/split/transfer/fee/etc.)
  with automatic lot creation and lot-matching on sells, producing realized
  gain/loss records with short/long-term holding-period classification.
- CSV import wizard with column mapping and a preview step before committing.
- Manual "legacy opening position" entry for old holdings where only a
  year-end balance is known (flagged as estimated cost basis).
- Dashboard with open positions, cost basis by asset type, and realized
  gain/loss totals (all-time and year-to-date).
- PDF export (via Electron's native `printToPDF`) for realized gains,
  current positions, and full transaction history.

## Not yet built (see DESIGN.md §6 for the full idea list)

- PDF/OCR ingestion of scanned statements (CSV import and manual entry cover
  old trades today; document OCR staging is the next tier).
- Live price feeds for unrealized P&L (manual price entry is the current
  fallback — a `manual_price` column already exists on `instruments`).
- Corporate actions (splits/mergers auto-adjusting lots), wash-sale flags,
  multi-currency FX conversion, dividend reinvestment automation.
