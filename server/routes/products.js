const express = require('express');
const db = require('../database');
const router = express.Router();

function generateSku() {
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(sku, 4) AS INTEGER)) as m FROM products WHERE sku LIKE 'MD-%'").get();
  return 'MD-' + String((row.m || 0) + 1).padStart(4, '0');
}

const DESCENDANTS_CTE = `
  WITH RECURSIVE descendants(id) AS (
    SELECT id FROM categories WHERE id = ?
    UNION ALL
    SELECT c.id FROM categories c JOIN descendants d ON c.parent_id = d.id
  )
`;

router.get('/', (req, res) => {
  const { category } = req.query;
  // in_stock=0 продукты НЕ скрываются — они показываются с пометкой "Pēc pasūtījuma".
  // Сортируем in-stock первыми внутри той же display_order группы.
  const order = 'ORDER BY in_stock DESC, display_order DESC, id DESC';
  let rows;
  if (category) {
    rows = db.prepare(`
      ${DESCENDANTS_CTE}
      SELECT * FROM products
       WHERE category_id IN (SELECT id FROM descendants)
       ${order}
    `).all(category);
  } else {
    rows = db.prepare(`SELECT * FROM products ${order}`).all();
  }
  res.json(rows);
});

router.get('/all', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY display_order DESC, id DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url, in_stock, display_order, sku } = req.body;
  if (!category_id || !name_lv || !name_ru || !name_en || price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  let finalSku = (sku || '').trim();
  if (finalSku) {
    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(finalSku);
    if (existing) return res.status(400).json({ error: 'SKU already exists' });
  } else {
    finalSku = generateSku();
  }
  const result = db.prepare(
    'INSERT INTO products (category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url, in_stock, display_order, sku) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(category_id, name_lv, name_ru, name_en, desc_lv||'', desc_ru||'', desc_en||'', price, image_url||'', in_stock ?? 1, display_order || 0, finalSku);
  res.json({ id: result.lastInsertRowid, sku: finalSku });
});

router.put('/:id', (req, res) => {
  const { name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url, in_stock, category_id, display_order, sku } = req.body;
  if (!category_id || !name_lv || !name_ru || !name_en || price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  let finalSku = (sku || '').trim();
  if (finalSku) {
    const existing = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(finalSku, req.params.id);
    if (existing) return res.status(400).json({ error: 'SKU already exists' });
  } else {
    finalSku = generateSku();
  }
  try {
    db.prepare(
      'UPDATE products SET category_id=?, name_lv=?, name_ru=?, name_en=?, desc_lv=?, desc_ru=?, desc_en=?, price=?, image_url=?, in_stock=?, display_order=?, sku=? WHERE id=?'
    ).run(category_id, name_lv, name_ru, name_en, desc_lv||'', desc_ru||'', desc_en||'', price, image_url||'', in_stock ?? 1, display_order || 0, finalSku, req.params.id);
    res.json({ ok: true, sku: finalSku });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/images/:imgId', (req, res) => {
  db.prepare('DELETE FROM product_images WHERE id=?').run(req.params.imgId);
  res.json({ ok: true });
});

router.get('/:id/images', (req, res) => {
  const rows = db.prepare(
    'SELECT id, image_url, sort_order FROM product_images WHERE product_id=? ORDER BY sort_order, id'
  ).all(req.params.id);
  res.json(rows);
});

router.post('/:id/images', (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url required' });
  const { m } = db.prepare(
    'SELECT COALESCE(MAX(sort_order),0) as m FROM product_images WHERE product_id=?'
  ).get(req.params.id);
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?,?,?)'
  ).run(req.params.id, image_url, m + 1);
  res.json({ id: lastInsertRowid, image_url, sort_order: m + 1 });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM product_images WHERE product_id=?').run(req.params.id);
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
