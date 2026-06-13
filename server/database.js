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

  CREATE TABLE IF NOT EXISTS service_carousels (
    service_slug TEXT NOT NULL,
    product_id   INTEGER NOT NULL,
    position     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (service_slug, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url  TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
`);

// Idempotent column-add migrations (SQLite has no "ADD COLUMN IF NOT EXISTS")
for (const sql of [
  'ALTER TABLE categories ADD COLUMN parent_id TEXT REFERENCES categories(id)',
  'ALTER TABLE products   ADD COLUMN display_order INTEGER DEFAULT 0',
  'ALTER TABLE products   ADD COLUMN sku TEXT',
  "ALTER TABLE orders     ADD COLUMN customer_type TEXT DEFAULT 'individual'",
  "ALTER TABLE orders     ADD COLUMN company_name  TEXT DEFAULT ''",
  "ALTER TABLE orders     ADD COLUMN reg_nr        TEXT DEFAULT ''",
  "ALTER TABLE orders     ADD COLUMN vat_nr        TEXT DEFAULT ''",
  "ALTER TABLE orders     ADD COLUMN legal_address TEXT DEFAULT ''",
]) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL');

// Backfill SKUs for products missing one (catches direct DB imports too)
const noSku = db.prepare("SELECT id FROM products WHERE sku IS NULL OR sku = '' ORDER BY id").all();
if (noSku.length) {
  const maxRow = db.prepare("SELECT MAX(CAST(SUBSTR(sku, 4) AS INTEGER)) as m FROM products WHERE sku LIKE 'MD-%'").get();
  let next = (maxRow.m || 0) + 1;
  const upd = db.prepare('UPDATE products SET sku = ? WHERE id = ?');
  for (const p of noSku) {
    upd.run('MD-' + String(next).padStart(4, '0'), p.id);
    next++;
  }
}

// Seed categories if empty
const count = db.prepare('SELECT COUNT(*) as n FROM categories').get();
if (count.n === 0) {
  const insert = db.prepare(
    'INSERT INTO categories (id, name_lv, name_ru, name_en, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  [
    ['video',          'Videonovērošana',                    'Видеонаблюдение',                   'Video Surveillance',       1],
    ['access-control', 'Piekļuves kontrole',                 'Контроль доступа',                  'Access Control',           2],
    ['locks',          'Slēdzenes',                          'Замки',                             'Locks',                    3],
    ['safes',          'Seifi',                              'Сейфы',                             'Safes',                    4],
    ['fire-alarm',     'Ugunsdrošības signalizācija',        'Пожарная сигнализация',             'Fire Alarm Systems',       5],
    ['metal-doors',    'Metāla durvis',                      'Металлические двери',               'Metal Doors',              6],
  ].forEach(row => insert.run(...row));
}

module.exports = db;
