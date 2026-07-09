export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS instruments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  exchange TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  manual_price REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(type, symbol)
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'brokerage',
  institution TEXT,
  cost_basis_method TEXT NOT NULL DEFAULT 'fifo',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER REFERENCES accounts(id),
  type TEXT NOT NULL DEFAULT 'other',
  year INTEGER,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  fees REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  fx_rate_to_usd REAL NOT NULL DEFAULT 1,
  notes TEXT,
  tags TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  document_id INTEGER REFERENCES documents(id),
  estimated_basis INTEGER NOT NULL DEFAULT 0,
  specific_lot_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_instrument
  ON transactions(account_id, instrument_id, date);

CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  open_transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  acquired_date TEXT NOT NULL,
  original_quantity REAL NOT NULL,
  remaining_quantity REAL NOT NULL,
  cost_basis_per_unit REAL NOT NULL,
  cost_basis_total REAL NOT NULL,
  estimated_basis INTEGER NOT NULL DEFAULT 0,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lots_account_instrument
  ON lots(account_id, instrument_id, acquired_date);

CREATE TABLE IF NOT EXISTS realized_gains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  sell_transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  lot_id INTEGER NOT NULL REFERENCES lots(id),
  quantity REAL NOT NULL,
  proceeds REAL NOT NULL,
  cost_basis REAL NOT NULL,
  gain REAL NOT NULL,
  term TEXT NOT NULL,
  holding_period_days INTEGER NOT NULL,
  acquired_date TEXT NOT NULL,
  sold_date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_realized_gains_account_instrument
  ON realized_gains(account_id, instrument_id, sold_date);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  transaction_id INTEGER NOT NULL,
  old_data TEXT,
  new_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS net_worth_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  original_value REAL,
  acquired_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_net_worth_items_category ON net_worth_items(category);
`
