export interface ManualSection {
  id: string
  icon: string
  title: string
  html: string
}

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'welcome',
    icon: '👋',
    title: 'Welcome — what this app does',
    html: `
<p>TradeApp is your one place to keep track of everything you buy and sell:
stocks, cryptocurrency, gold and other commodities, bonds, funds — anything.
You write down each trade (or import old records), and the app automatically
figures out your <strong>profit or loss</strong> whenever you sell something.</p>
<p>Everything is stored <strong>only on this computer</strong>. There is no
account to sign into, nothing goes to the internet, and the app works
completely offline.</p>
<p>The three things you'll do most often:</p>
<ul>
<li><strong>Record a trade</strong> when you buy or sell something.</li>
<li><strong>Look at your portfolio</strong> on the Dashboard to see what you own and how you're doing.</li>
<li><strong>Save a PDF report</strong> at tax time or whenever you want a paper copy.</li>
</ul>`
  },
  {
    id: 'first-time',
    icon: '🚀',
    title: 'First-time setup (do this once)',
    html: `
<p>Before recording trades, the app needs to know <em>where</em> your
investments live. That's called an <strong>Account</strong>.</p>
<ol>
<li>Open the <strong>Accounts</strong> page.</li>
<li>Type a name — for example <em>"Fidelity"</em>, <em>"Coinbase"</em>, or <em>"Old records before 2020"</em>.</li>
<li>Pick what kind it is: a brokerage, a crypto wallet/exchange, or "Legacy" for old paperwork.</li>
<li>Leave <strong>Cost basis method</strong> on FIFO unless your brokerage statement says otherwise (see the "Cost basis methods" section below for what this means).</li>
<li>Click <strong>Add account</strong>. Done!</li>
</ol>
<p>Make one account for each real-world place you hold investments. You can
always add more later.</p>`
  },
  {
    id: 'recording',
    icon: '💱',
    title: 'Recording a trade (buying or selling)',
    html: `
<p>Go to <strong>Record Trades</strong>. The form at the top is where you enter each trade:</p>
<ol>
<li><strong>Account</strong> — where this trade happened.</li>
<li><strong>Transaction type</strong> — usually <em>buy</em> or <em>sell</em>. (Dividends, fees, and transfers are also here.)</li>
<li><strong>Instrument type</strong> — stock, crypto, commodity, etc. This narrows down the next list.</li>
<li><strong>Instrument</strong> — the actual thing, like AAPL or Bitcoin. Type in the little search box to filter the list.</li>
<li><strong>Date</strong> — the day the trade happened.</li>
<li><strong>Quantity</strong> — how many shares/coins/ounces.</li>
<li><strong>Price per unit</strong> — what one share/coin/ounce cost.</li>
<li><strong>Fees</strong> — any commission you paid (0 is fine).</li>
<li>Click <strong>Save transaction</strong>.</li>
</ol>
<p><strong>That's it.</strong> The app calculates the total for you, and when you
sell, it automatically matches the sale against what you bought earlier and
records your profit or loss.</p>
<p>💡 <em>Example:</em> You buy 10 ounces of gold on March 1 at $2,000 each, then
sell 4 ounces on March 15 at $2,100. The app knows those 4 ounces originally
cost $2,000 each, so it records a profit of about $400 — you don't have to
calculate anything.</p>
<p><strong>Made a mistake?</strong> Every row in the history table has an
<strong>✏️ Edit</strong> and a <strong>🗑 Delete</strong> button. Fix the numbers
or remove the entry, and all profits are recalculated automatically.</p>
<p><strong>Stock split?</strong> Pick the <em>split</em> transaction type and enter
the ratio of new shares per old share (a 4-for-1 split is 4; a 1-for-10 reverse
split is 0.1). Your share count and per-share cost update automatically — your
total investment stays the same.</p>
<p><strong>Wash-sale watch:</strong> if you buy something back within 30 days of
selling it at a loss, the app shows a gentle warning (US tax rules may disallow
that loss). It never blocks you — it just gives you a heads-up, and marks the
affected rows with ⚠️ on the Reports page.</p>`
  },
  {
    id: 'importing',
    icon: '📥',
    title: 'Bringing in old trades',
    html: `
<p>The <strong>Import Old Trades</strong> page gives you two ways to enter history:</p>
<p><strong>Way 1 — Import a CSV file (or paste rows).</strong> Most brokerages and
crypto exchanges let you download your trade history as a "CSV" file (a simple
spreadsheet). On their website look for <em>Export</em>, <em>Download history</em>,
or <em>Statements &amp; documents</em>. No file handy? Click
<strong>"…or paste rows from a spreadsheet"</strong> and paste rows copied straight
out of Excel, Google Sheets, or a statement table — include the header row.</p>
<ol>
<li>Click <strong>Choose CSV file…</strong> and pick the downloaded file.</li>
<li>The app guesses which column is the date, which is the price, and so on. Check its guesses in the dropdowns and fix any that are wrong.</li>
<li>Look at the <strong>preview</strong> of the first few rows to make sure things line up.</li>
<li>Click <strong>Import rows</strong>. Nothing is saved until you click this.</li>
</ol>
<p><strong>Way 2 — Type in an old position by hand.</strong> For really old
records where you only know "I owned 100 shares of XYZ at the end of 2015,"
use the second form on that page. Enter the quantity, the date, and the total
cost if you know it. If you don't know what you paid, check
<strong>"Cost basis unknown"</strong> — the app marks it as estimated so your
reports stay honest.</p>`
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Understanding your Dashboard',
    html: `
<p>The Dashboard (also called <strong>My Portfolio</strong>) is your at-a-glance summary:</p>
<ul>
<li><strong>Open positions</strong> — how many different things you currently own.</li>
<li><strong>Total cost basis</strong> — how much money you've put into what you still own.</li>
<li><strong>Realized gain</strong> — profit (or loss) from things you've <em>already sold</em>, all-time and this year.</li>
<li><strong>Unrealized gain</strong> — profit on paper for things you <em>still own</em>. This appears once you set a current price (see next section).</li>
</ul>
<p>Below the numbers you'll find two pictures of your money:</p>
<ul>
<li><strong>Where your money is</strong> — a color bar showing how your investments split across stocks, crypto, gold, and so on. Hover over any segment or legend entry to see the exact amount.</li>
<li><strong>Realized gain by year</strong> — columns showing your profit (or loss) from completed sales, year by year. Hover over a column for the exact figure.</li>
</ul>
<p>The tables below the charts show the same numbers in detail.</p>`
  },
  {
    id: 'prices',
    icon: '💲',
    title: 'Current prices & profit on paper',
    html: `
<p>The app works offline, so it doesn't fetch live market prices. Instead you
can type in today's price for anything you own, right on the Dashboard:</p>
<ol>
<li>Find the position in the <strong>Current positions</strong> table.</li>
<li>Type today's price into the <strong>Current price</strong> box on that row and press Enter (or click away).</li>
<li>The <strong>Market value</strong> and <strong>Unrealized gain</strong> columns fill in instantly.</li>
</ol>
<p>Update prices whenever you like — once a week, once a month, or just when
you're curious. The prices you type are remembered until you change them.</p>`
  },
  {
    id: 'reports',
    icon: '📄',
    title: 'Reports and saving PDFs',
    html: `
<p>The <strong>Reports &amp; PDF</strong> page shows your <strong>realized
gains and losses</strong> — the numbers you (or your accountant) need at tax
time. Each sale shows when you bought, when you sold, the profit or loss, and
whether it was <em>short-term</em> (held one year or less) or
<em>long-term</em> (held more than a year) — that distinction matters for taxes.</p>
<ul>
<li>Type a year into the <strong>Year</strong> box to see just that year (for example, 2025 for this year's taxes).</li>
<li>Click <strong>Export this table to PDF</strong> to save it as a PDF file anywhere you like — perfect for emailing to an accountant or printing.</li>
</ul>
<p>Below that, <strong>Print transactions for any period</strong> lets you turn any
slice of your history into a printable PDF:</p>
<ul>
<li>Type a <strong>year</strong> (like 2024) and the From/To dates fill in automatically for that whole year.</li>
<li>Or pick any exact <strong>From</strong> and <strong>To</strong> dates — a single month, a quarter, whatever you need.</li>
<li>Leave everything blank to print your complete history.</li>
<li>A preview shows exactly what will be in the PDF before you export it.</li>
</ul>
<p>You can also export your <strong>current positions</strong> as a PDF.</p>`
  },
  {
    id: 'instruments',
    icon: '📈',
    title: 'Instruments — what you can track',
    html: `
<p>An "instrument" is anything you can trade. The app comes pre-loaded with the
<strong>top 100 cryptocurrencies</strong> and common <strong>commodities</strong>
(gold, silver, oil, and more). Stocks, funds, and bonds are added as you use
them — and you can add anything yourself:</p>
<ol>
<li>Go to the <strong>Instruments</strong> page.</li>
<li>Pick the type (stock, bond, crypto, custom…).</li>
<li>Type the ticker symbol (like <code>AAPL</code>) and the name (like <em>Apple Inc.</em>).</li>
<li>Click <strong>Add instrument</strong>.</li>
</ol>
<p>It immediately becomes available when recording trades. Use the
<strong>Custom / Other</strong> type for anything unusual — private investments,
collectibles, anything you want to track.</p>`
  },
  {
    id: 'cost-basis',
    icon: '🧮',
    title: 'Cost basis methods, explained simply',
    html: `
<p>When you sell <em>part</em> of something you bought at different times and
prices, there's a question: <em>which</em> purchase are you selling? The answer
changes your taxable profit. Each account has a setting for this:</p>
<ul>
<li><strong>FIFO</strong> (first in, first out) — you sell your <em>oldest</em> purchases first. This is the most common default at brokerages. <em>When in doubt, use this.</em></li>
<li><strong>LIFO</strong> (last in, first out) — you sell your <em>newest</em> purchases first.</li>
<li><strong>Average cost</strong> — every unit counts at your average purchase price. Mutual funds often use this.</li>
<li><strong>Specific lot</strong> — you pick exactly which purchase to sell from, each time you sell. The most control, one extra step per sale.</li>
</ul>
<p>Match this setting to what your real brokerage uses so the app's numbers
agree with your official tax forms.</p>`
  },
  {
    id: 'personalize',
    icon: '🎨',
    title: 'Making it yours — themes & layouts',
    html: `
<p>Open <strong>Settings</strong> to change how the app looks and feels:</p>
<ul>
<li><strong>20 color themes</strong> — 12 light and 8 dark. Click one to try it on instantly; your pick is remembered.</li>
<li><strong>4 layouts:</strong>
  <ul>
  <li><em>Classic Sidebar</em> — the full menu down the left side.</li>
  <li><em>Compact Sidebar</em> — a slim icon strip; hover over an icon to see its name.</li>
  <li><em>Top Bar</em> — the menu runs across the top instead.</li>
  <li><em>Big &amp; Simple</em> — bigger text everywhere, plus a Home screen with large, clearly-labeled buttons for each task. If you ever feel lost, switch to this one.</li>
  </ul>
</li>
</ul>`
  },
  {
    id: 'backup',
    icon: '💾',
    title: 'Keeping your data safe',
    html: `
<p>All your data lives in a single file on this computer:</p>
<p><code>%APPDATA%\\tradeapp\\tradeapp.db</code></p>
<p>(Paste that into the address bar of any File Explorer window to jump to it.)</p>
<ul>
<li><strong>To back up:</strong> copy that file to a USB stick, external drive, or cloud folder every so often — especially after entering a lot of data.</li>
<li><strong>To restore:</strong> close the app and copy your backup file back to the same location.</li>
<li>PDF exports are also a good "paper trail" — consider exporting your full transaction history once a year and keeping it with your tax papers.</li>
</ul>`
  },
  {
    id: 'troubleshooting',
    icon: '🔧',
    title: 'Tips & troubleshooting',
    html: `
<ul>
<li><strong>"Cannot sell X: only Y open units available"</strong> — the app won't let you sell more than it knows you own. Usually this means an old purchase hasn't been entered yet. Add the missing buy (or a legacy opening position) first, then record the sale.</li>
<li><strong>Made a typo in a trade?</strong> On the Record Trades page, every row in the history has an <strong>✏️ Edit</strong> and a <strong>🗑 Delete</strong> button. Fix the numbers or remove the entry — all profits and lots are recalculated automatically, and every change is kept in a behind-the-scenes audit log.</li>
<li><strong>"This change would make a later sale invalid"</strong> — if editing or deleting a purchase would leave a later sale selling more than you owned, the app refuses and nothing changes. Fix or remove the later sale first.</li>
<li><strong>CSV import shows errors for some rows</strong> — those rows are skipped, everything else imports fine. The error list tells you which rows to check (row numbers match your spreadsheet).</li>
<li><strong>A sale was split into several rows on the Reports page</strong> — that's normal! If one sale drew from multiple purchases, tax rules require reporting each piece separately, and the app does that for you.</li>
<li><strong>Numbers marked "(est.)"</strong> — these came from an import or legacy entry where the exact cost wasn't known. Treat them as approximate.</li>
</ul>`
  },
  {
    id: 'glossary',
    icon: '📖',
    title: 'Glossary — plain-English definitions',
    html: `
<ul>
<li><strong>Instrument</strong> — anything you can trade (a stock, a coin, gold…).</li>
<li><strong>Ticker / symbol</strong> — the short code for an instrument, like AAPL or BTC.</li>
<li><strong>Position</strong> — what you currently own of one instrument.</li>
<li><strong>Lot</strong> — one purchase batch. Buying twice creates two lots.</li>
<li><strong>Cost basis</strong> — what you paid for something, including fees.</li>
<li><strong>Proceeds</strong> — what you received when you sold, after fees.</li>
<li><strong>Realized gain/loss</strong> — actual profit or loss from a completed sale.</li>
<li><strong>Unrealized gain/loss</strong> — profit or loss "on paper" for things you still hold.</li>
<li><strong>Short-term / long-term</strong> — held one year or less / more than one year. Long-term profits are usually taxed at a lower rate.</li>
<li><strong>FIFO / LIFO</strong> — rules for deciding which purchase you're selling (oldest-first / newest-first).</li>
<li><strong>Stock split</strong> — a company multiplies everyone's shares (4-for-1 means every 1 share becomes 4). You own more shares, each worth less; your total is unchanged.</li>
<li><strong>Wash sale</strong> — selling at a loss and buying the same thing back within 30 days. US tax rules may disallow the loss; the app flags these with ⚠️.</li>
<li><strong>CSV</strong> — a simple spreadsheet file most brokerages can export.</li>
</ul>`
  }
]

export function manualToHtml(): string {
  return MANUAL_SECTIONS.map((s) => `<h2>${s.icon} ${s.title}</h2>${s.html}`).join('\n')
}
