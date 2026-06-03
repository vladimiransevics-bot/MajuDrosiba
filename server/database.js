const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'majudrosiba.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id   TEXT PRIMARY KEY,
    name_lv TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id TEXT NOT NULL REFERENCES categories(id),
    name_lv     TEXT NOT NULL,
    name_ru     TEXT NOT NULL,
    name_en     TEXT NOT NULL,
    desc_lv     TEXT DEFAULT '',
    desc_ru     TEXT DEFAULT '',
    desc_en     TEXT DEFAULT '',
    price       REAL NOT NULL DEFAULT 0,
    image_url   TEXT DEFAULT '',
    in_stock    INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT DEFAULT '',
    address     TEXT DEFAULT '',
    items       TEXT NOT NULL,
    total       REAL NOT NULL,
    notes       TEXT DEFAULT '',
    status      TEXT DEFAULT 'new',
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

// Seed categories if empty
const count = db.prepare('SELECT COUNT(*) as n FROM categories').get();
if (count.n === 0) {
  const insert = db.prepare(
    'INSERT INTO categories (id, name_lv, name_ru, name_en, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  [
    ['video',          'Videonovērošana',                    'Видеонаблюдение',                   'Video Surveillance',       1],
    ['access-control', 'Piekļuves kontrole',                 'Контроль доступа',                  'Access Control',           2],
    ['smart-locks',    'Viedās slēdzenes',                   'Умные замки',                       'Smart Locks',              3],
    ['safes',          'Seifi',                              'Сейфы',                             'Safes',                    4],
    ['fire-alarm',     'Ugunsdrošības signalizācija',        'Пожарная сигнализация',             'Fire Alarm Systems',       5],
    ['metal-doors',    'Metāla durvis',                      'Металлические двери',               'Metal Doors',              6],
    ['locks',          'Mehāniskās un elektroniskās slēdzenes','Механические и электронные замки','Mechanical & Electronic Locks', 7],
  ].forEach(row => insert.run(...row));
}

module.exports = db;
