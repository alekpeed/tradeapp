# TradeApp — Design Document

A single place for your mom to record every trade she's ever made — old
consolidated statements, individual trades going forward — across every
asset class, with automatic profit/loss tracking and PDF exports.

## 1. Goals

- One home for trade history: back-fill old years + log new trades going forward.
- Support "most tradable things": stocks, crypto, bonds, commodities, options,
  ETFs/mutual funds, forex, cash/money market — plus fully custom tickers.
- Every trade captures **date, quantity, price/amount** at minimum.
- Automatic linking of buys → later sells for the same asset, producing
  realized profit/loss (not just a spreadsheet of unconnected rows).
- Import old documents (consolidated 1099s, statements, trade confirmations)
  instead of retyping years of history.
- Export any view (a year, an account, a single position, full tax report)
  to PDF.

## 2. Core data model

### Instrument
The "what" being traded.

| field | notes |
|---|---|
| `id` | |
| `type` | `stock`, `etf`, `mutual_fund`, `bond`, `crypto`, `commodity`, `forex`, `option`, `future`, `reit`, `cash`, `custom` |
| `symbol` | ticker / trading pair, e.g. `AAPL`, `BTC-USD`, `XAU` |
| `name` | display name |
| `exchange` | optional (NYSE, NASDAQ, Coinbase, COMEX, OTC…) |
| `currency` | trade currency, default USD |
| `metadata` | type-specific: bond → CUSIP/coupon/maturity date; commodity → unit (oz, barrel, bushel); option → underlying/strike/expiry/call-or-put; crypto → chain/contract address |

Seed the instrument table with:
- Top 100 cryptocurrencies by market cap (refreshable list, not frozen — rankings
  shift monthly).
- A short list of common commodities (gold, silver, oil, natural gas, corn, etc.)
  and major indices, as convenience presets.
- **"Add custom"** is always available for anything not in the presets —
  private placements, employer RSUs, a friend's startup, collectibles, whatever.

### Account
Represents a real-world source of the trades: a specific brokerage account,
a crypto wallet/exchange, or a bucket like "Legacy — pre-2020 statements"
for bulk-imported history where transaction-level detail isn't available.

### Transaction
The actual event. One row per buy, sell, dividend, interest, transfer, split, fee.

| field | notes |
|---|---|
| `account_id`, `instrument_id` | |
| `type` | `buy`, `sell`, `dividend`, `interest`, `split`, `transfer_in`, `transfer_out`, `fee`, `deposit`, `withdrawal` |
| `date` | trade date (settlement date optional, secondary) |
| `quantity` | shares/coins/units/contracts |
| `price` | per-unit price |
| `amount` | total (quantity × price ± fees), stored explicitly — never trust a derived float |
| `fees` | commission/fees, tracked separately so cost basis is accurate |
| `currency` | + FX rate to USD on that date, for non-USD trades |
| `notes` / `tags` | free text + tags like "DRIP", "gift", "tax-loss harvest" |
| `source` | `manual`, `csv_import`, `pdf_import`, `ocr` — keeps provenance |
| `document_id` | link back to the source file, if any |

Use fixed-point/decimal types for all money and quantity fields — never
floating point — so P&L calculations don't drift by fractions of a cent.

### Lots & realized P&L (the "buy gold, sell two weeks later" case)
Every `buy` creates a **lot**: quantity + cost basis + acquisition date.
Every `sell` consumes one or more open lots for that instrument/account and
produces a **RealizedGainLoss** record:

- proceeds − cost basis (+ allocated fees) = gain/loss
- holding period = sell date − lot acquisition date → short-term (≤1yr) vs
  long-term (>1yr), which matters a lot for US tax purposes
- lot-matching method is configurable per account: **FIFO** (default),
  **LIFO**, **average cost**, or **specific lot ID** (pick exactly which
  purchase you're selling against — brokerages let you do this for stocks)

This is what turns "a list of trades" into "profit/loss per position and in
aggregate," and it's the same mechanism that answers "did I make money on
gold this year," "what's my total realized gain for taxes," etc.

Unrealized P&L (open positions) needs current market price — see §5.

### Document
An uploaded file (PDF/CSV/image) representing a statement, 1099, or trade
confirmation. Extracted transactions are **staged for review** before they
become real transactions — never auto-commit parsed financial data without
a confirm step, since OCR/PDF parsing of statements is never 100% reliable.

## 3. Importing old history

Three tiers, since old records vary a lot in quality:

1. **CSV import** — most brokerages (Fidelity, Schwab, Vanguard, Coinbase,
   Kraken, etc.) export CSV. Build a mapping wizard: upload → map columns →
   preview → confirm. Save the mapping per-source so re-imports are one click.
2. **PDF/statement parsing** — for consolidated 1099s and monthly statements:
   extract text/tables, attempt to auto-detect trade rows, and always show a
   staged "here's what I found, please confirm" screen before committing.
3. **Manual/legacy bulk entry** — for really old stuff where she just has a
   year-end balance, not transaction detail: let her enter a **starting
   position** (quantity + total cost basis as of a date, or "unknown basis")
   attached to the "Legacy" account. Flag these clearly as estimated-basis so
   later reports don't silently imply more precision than exists.

## 4. PDF export

Any view should be exportable: full transaction history, a single year, a
single account, a single instrument, a realized-gains report (formatted
close to what's needed for Schedule D / Form 8949), or a portfolio summary.
Keep the original source documents attached/downloadable too, so a given
year's folder is self-contained.

## 5. Prices (for unrealized P&L & dashboards)
- Crypto: free feeds (CoinGecko et al.) cover top 100+ easily.
- Stocks/ETFs: any standard market data API.
- Bonds/commodities/custom assets: harder to get free live pricing — support
  manual price entry/override so unrealized P&L still works for illiquid or
  custom holdings.
- Cache prices; don't hit APIs on every page load.

## 6. Other features worth considering

- **Dividends/interest & reinvestment (DRIP)** as first-class transaction types.
- **Corporate actions**: stock splits, mergers, spin-offs, ticker changes —
  these need to adjust existing lots, not just get logged as a new trade.
- **Wash-sale flagging** (US rule: repurchasing a "substantially identical"
  security within 30 days of a loss-sale disallows the loss) — a nice
  automatic check to warn her before it happens.
- **Multi-currency** support with FX rate captured at trade date.
- **Cost-basis method per account**, matching whatever her actual brokerage
  uses, so her numbers reconcile with the official 1099.
- **Reconciliation**: compare the app's computed position against a broker
  statement and flag mismatches — catches typos and missed imports early.
- **Dashboard**: net worth over time, allocation by asset class, top
  gainers/losers, realized vs. unrealized split.
- **Performance metrics**: total return %, XIRR/CAGR per position and
  overall — more meaningful than raw dollar P&L when cash flows vary.
- **Watchlist**: track prices on things she doesn't own yet.
- **Tax reports**: year-end realized gains summary formatted close to
  Form 8949/Schedule D, exportable for her accountant or tax software.
- **Security**: this is sensitive financial data — encryption at rest,
  strong auth (passkey/2FA), audit log of edits, soft-delete (never a hard
  delete of financial records), regular backups/export (CSV+JSON) she owns.
- **Shared access**: optional read-only or contributor login for you or an
  accountant, without giving away the account password.
- **Mobile-friendly capture**: snap a photo of a paper trade confirmation
  with a phone and route it through the same OCR staging pipeline.

## 7. Suggested stack (lightweight, single-family-use app)

- **Backend**: FastAPI (Python) or Node/Express — either is fine; Python
  has better PDF/OCR library support if that matters more than JS familiarity.
- **DB**: Postgres (or SQLite if this stays single-user/self-hosted) — use
  `NUMERIC`/`DECIMAL` columns for all money/quantity fields.
- **Frontend**: React, responsive tables + charts (allocation pie, net worth
  line chart).
- **PDF generation**: HTML → PDF (Puppeteer/wkhtmltopdf) or `reportlab`.
- **OCR/parsing**: `pdfplumber` for text PDFs, `pytesseract` for scanned
  images, staged-review UI in front of both.
- **Hosting**: single Docker container is enough for one family's data;
  cheap managed hosting (Fly.io/Render) or fully self-hosted both work.

## 8. Suggested build order

1. Data model + manual transaction entry (stocks/crypto only) → prove the
   lot-matching/realized-P&L logic works.
2. Expand instrument types (bonds, commodities, custom) + top-100 crypto seed.
3. CSV import wizard.
4. Dashboard + PDF export.
5. PDF/OCR statement ingestion with staged review.
6. Price feeds for unrealized P&L, corporate actions, wash-sale flags, tax report formatting.
