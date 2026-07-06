# TradeApp User Manual

*This same manual is available inside the app on the **Help** page, where it can
also be saved as a PDF with one click.*

---

## 👋 Welcome — what this app does

TradeApp is your one place to keep track of everything you buy and sell:
stocks, cryptocurrency, gold and other commodities, bonds, funds — anything.
You write down each trade (or import old records), and the app automatically
figures out your **profit or loss** whenever you sell something.

Everything is stored **only on this computer**. There is no account to sign
into, nothing goes to the internet, and the app works completely offline.

The three things you'll do most often:

- **Record a trade** when you buy or sell something.
- **Look at your portfolio** on the Dashboard to see what you own and how you're doing.
- **Save a PDF report** at tax time or whenever you want a paper copy.

---

## 🚀 First-time setup (do this once)

Before recording trades, the app needs to know *where* your investments live.
That's called an **Account**.

1. Open the **Accounts** page.
2. Type a name — for example *"Fidelity"*, *"Coinbase"*, or *"Old records before 2020"*.
3. Pick what kind it is: a brokerage, a crypto wallet/exchange, or "Legacy" for old paperwork.
4. Leave **Cost basis method** on FIFO unless your brokerage statement says
   otherwise (see "Cost basis methods" below for what this means).
5. Click **Add account**. Done!

Make one account for each real-world place you hold investments. You can
always add more later.

---

## 💱 Recording a trade (buying or selling)

Go to **Record Trades**. The form at the top is where you enter each trade:

1. **Account** — where this trade happened.
2. **Transaction type** — usually *buy* or *sell*. (Dividends, fees, and transfers are also here.)
3. **Instrument type** — stock, crypto, commodity, etc. This narrows down the next list.
4. **Instrument** — the actual thing, like AAPL or Bitcoin. Type in the little search box to filter the list.
5. **Date** — the day the trade happened.
6. **Quantity** — how many shares/coins/ounces.
7. **Price per unit** — what one share/coin/ounce cost.
8. **Fees** — any commission you paid (0 is fine).
9. Click **Save transaction**.

**That's it.** The app calculates the total for you, and when you sell, it
automatically matches the sale against what you bought earlier and records
your profit or loss.

> 💡 **Example:** You buy 10 ounces of gold on March 1 at $2,000 each, then
> sell 4 ounces on March 15 at $2,100. The app knows those 4 ounces originally
> cost $2,000 each, so it records a profit of about $400 — you don't have to
> calculate anything.

**Made a mistake?** Every row in the history table has an **✏️ Edit** and a
**🗑 Delete** button. Fix the numbers or remove the entry, and all profits are
recalculated automatically.

**Stock split?** Pick the *split* transaction type and enter the ratio of new
shares per old share (a 4-for-1 split is 4; a 1-for-10 reverse split is 0.1).
Your share count and per-share cost update automatically — your total
investment stays the same.

**Wash-sale watch:** if you buy something back within 30 days of selling it at
a loss, the app shows a gentle warning (US tax rules may disallow that loss).
It never blocks you — it just gives you a heads-up, and marks the affected rows
with ⚠️ on the Reports page.

---

## 📥 Bringing in old trades

The **Import Old Trades** page gives you two ways to enter history:

### Way 1 — Import a CSV file (or paste rows)

Most brokerages and crypto exchanges let you download your trade history as a
"CSV" file (a simple spreadsheet). On their website look for *Export*,
*Download history*, or *Statements & documents*. No file handy? Click
**"…or paste rows from a spreadsheet"** and paste rows copied straight out of
Excel, Google Sheets, or a statement table — include the header row.

1. Click **Choose CSV file…** and pick the downloaded file.
2. The app guesses which column is the date, which is the price, and so on.
   Check its guesses in the dropdowns and fix any that are wrong.
3. Look at the **preview** of the first few rows to make sure things line up.
4. Click **Import rows**. Nothing is saved until you click this.

### Way 2 — Type in an old position by hand

For really old records where you only know "I owned 100 shares of XYZ at the
end of 2015," use the second form on that page. Enter the quantity, the date,
and the total cost if you know it. If you don't know what you paid, check
**"Cost basis unknown"** — the app marks it as estimated so your reports stay
honest.

---

## 📊 Understanding your Dashboard

The Dashboard (also called **My Portfolio**) is your at-a-glance summary:

- **Open positions** — how many different things you currently own.
- **Total cost basis** — how much money you've put into what you still own.
- **Realized gain** — profit (or loss) from things you've *already sold*, all-time and this year.
- **Unrealized gain** — profit on paper for things you *still own*. This
  appears once you set a current price (see next section).

Below the numbers you'll find two pictures of your money:

- **Where your money is** — a color bar showing how your investments split
  across stocks, crypto, gold, and so on. Hover over any segment or legend
  entry to see the exact amount.
- **Realized gain by year** — columns showing your profit (or loss) from
  completed sales, year by year. Hover over a column for the exact figure.

The tables below the charts show the same numbers in detail.

---

## 💲 Current prices & profit on paper

The app works offline, so it doesn't fetch live market prices. Instead you can
type in today's price for anything you own, right on the Dashboard:

1. Find the position in the **Current positions** table.
2. Type today's price into the **Current price** box on that row and press
   Enter (or click away).
3. The **Market value** and **Unrealized gain** columns fill in instantly.

Update prices whenever you like — once a week, once a month, or just when
you're curious. The prices you type are remembered until you change them.

---

## 📄 Reports and saving PDFs

The **Reports & PDF** page shows your **realized gains and losses** — the
numbers you (or your accountant) need at tax time. Each sale shows when you
bought, when you sold, the profit or loss, and whether it was *short-term*
(held one year or less) or *long-term* (held more than a year) — that
distinction matters for taxes.

- Type a year into the **Year** box to see just that year (for example, 2025
  for this year's taxes).
- Click **Export this table to PDF** to save it as a PDF file anywhere you
  like — perfect for emailing to an accountant or printing.

Below that, **Print transactions for any period** lets you turn any slice of
your history into a printable PDF:

- Type a **year** (like 2024) and the From/To dates fill in automatically for
  that whole year.
- Or pick any exact **From** and **To** dates — a single month, a quarter,
  whatever you need.
- Leave everything blank to print your complete history.
- A preview shows exactly what will be in the PDF before you export it.

You can also export your **current positions** as a PDF.

---

## 📈 Instruments — what you can track

An "instrument" is anything you can trade. The app comes pre-loaded with the
**top 100 cryptocurrencies** and common **commodities** (gold, silver, oil,
and more). Stocks, funds, and bonds are added as you use them — and you can
add anything yourself:

1. Go to the **Instruments** page.
2. Pick the type (stock, bond, crypto, custom…).
3. Type the ticker symbol (like `AAPL`) and the name (like *Apple Inc.*).
4. Click **Add instrument**.

It immediately becomes available when recording trades. Use the
**Custom / Other** type for anything unusual — private investments,
collectibles, anything you want to track.

---

## 🧮 Cost basis methods, explained simply

When you sell *part* of something you bought at different times and prices,
there's a question: *which* purchase are you selling? The answer changes your
taxable profit. Each account has a setting for this:

| Method | What it means |
|---|---|
| **FIFO** (first in, first out) | You sell your *oldest* purchases first. The most common default at brokerages. *When in doubt, use this.* |
| **LIFO** (last in, first out) | You sell your *newest* purchases first. |
| **Average cost** | Every unit counts at your average purchase price. Mutual funds often use this. |
| **Specific lot** | You pick exactly which purchase to sell from, each time you sell. The most control, one extra step per sale. |

Match this setting to what your real brokerage uses so the app's numbers
agree with your official tax forms.

---

## 🎨 Making it yours — themes & layouts

Open **Settings** to change how the app looks and feels:

- **20 color themes** — 12 light and 8 dark. Click one to try it on instantly;
  your pick is remembered.
- **4 layouts:**
  - *Classic Sidebar* — the full menu down the left side.
  - *Compact Sidebar* — a slim icon strip; hover over an icon to see its name.
  - *Top Bar* — the menu runs across the top instead.
  - *Big & Simple* — bigger text everywhere, plus a Home screen with large,
    clearly-labeled buttons for each task. **If you ever feel lost, switch to
    this one.**

---

## 🔄 Staying up to date

TradeApp checks for new versions automatically each time it starts (it needs
an internet connection for this — everything else in the app works fine
offline). You don't need to do anything:

1. If an update is found, it downloads quietly in the background while you keep working.
2. Once it's ready, a small box appears in the bottom-right corner of the window saying **"Update ready."**
3. Click **"Restart now to update"** whenever it's convenient — the app closes and reopens on the new version in a few seconds. Nothing is lost; all your data stays exactly as it was.

Don't want to wait for the automatic check? Go to **Settings** and click
**"Check for updates now"** any time.

---

## 💾 Keeping your data safe

All your data lives in a single file on this computer:

```
%APPDATA%\tradeapp\tradeapp.db
```

(Paste that into the address bar of any File Explorer window to jump to it.)

- **To back up:** copy that file to a USB stick, external drive, or cloud
  folder every so often — especially after entering a lot of data.
- **To restore:** close the app and copy your backup file back to the same
  location.
- PDF exports are also a good "paper trail" — consider exporting your full
  transaction history once a year and keeping it with your tax papers.

---

## 🔧 Tips & troubleshooting

- **"Cannot sell X: only Y open units available"** — the app won't let you
  sell more than it knows you own. Usually this means an old purchase hasn't
  been entered yet. Add the missing buy (or a legacy opening position) first,
  then record the sale.
- **Made a typo in a trade?** On the Record Trades page, every row in the
  history has an **✏️ Edit** and a **🗑 Delete** button. Fix the numbers or
  remove the entry — all profits and lots are recalculated automatically, and
  every change is kept in a behind-the-scenes audit log.
- **"This change would make a later sale invalid"** — if editing or deleting
  a purchase would leave a later sale selling more than you owned, the app
  refuses and nothing changes. Fix or remove the later sale first.
- **CSV import shows errors for some rows** — those rows are skipped,
  everything else imports fine. The error list tells you which rows to check
  (row numbers match your spreadsheet).
- **A sale was split into several rows on the Reports page** — that's normal!
  If one sale drew from multiple purchases, tax rules require reporting each
  piece separately, and the app does that for you.
- **Numbers marked "(est.)"** — these came from an import or legacy entry
  where the exact cost wasn't known. Treat them as approximate.

---

## 📖 Glossary — plain-English definitions

| Term | Meaning |
|---|---|
| **Instrument** | Anything you can trade (a stock, a coin, gold…). |
| **Ticker / symbol** | The short code for an instrument, like AAPL or BTC. |
| **Position** | What you currently own of one instrument. |
| **Lot** | One purchase batch. Buying twice creates two lots. |
| **Cost basis** | What you paid for something, including fees. |
| **Proceeds** | What you received when you sold, after fees. |
| **Realized gain/loss** | Actual profit or loss from a completed sale. |
| **Unrealized gain/loss** | Profit or loss "on paper" for things you still hold. |
| **Short-term / long-term** | Held one year or less / more than one year. Long-term profits are usually taxed at a lower rate. |
| **FIFO / LIFO** | Rules for deciding which purchase you're selling (oldest-first / newest-first). |
| **Stock split** | A company multiplies everyone's shares (4-for-1 means every 1 share becomes 4). You own more shares, each worth less; your total is unchanged. |
| **Wash sale** | Selling at a loss and buying the same thing back within 30 days. US tax rules may disallow the loss; the app flags these with ⚠️. |
| **CSV** | A simple spreadsheet file most brokerages can export. |
