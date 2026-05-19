const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'commercial')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'validated', 'sent')),
      issue_date TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      discount_rate REAL NOT NULL DEFAULT 0,
      deposit_rate REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by INTEGER NOT NULL,
      validated_at TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS quote_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      vat_rate REAL NOT NULL,
      FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quote_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      performed_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
      FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

function ensureSeedData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const insert = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    insert.run('admin', bcrypt.hashSync('admin123', 10), 'admin');
    insert.run('commercial', bcrypt.hashSync('commercial123', 10), 'commercial');
  }
}

function getNextQuoteNumber() {
  const year = new Date().getFullYear();
  const likePattern = `DEV-${year}-%`;
  const row = db
    .prepare(
      `SELECT quote_number FROM quotes
       WHERE quote_number LIKE ?
       ORDER BY quote_number DESC
       LIMIT 1`
    )
    .get(likePattern);

  let next = 1;
  if (row && row.quote_number) {
    const parts = row.quote_number.split('-');
    const current = Number(parts[2]);
    if (Number.isFinite(current)) {
      next = current + 1;
    }
  }

  return `DEV-${year}-${String(next).padStart(4, '0')}`;
}

migrate();
ensureSeedData();

module.exports = {
  db,
  getNextQuoteNumber
};
