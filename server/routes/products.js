const express = require('express');
const db = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  const sql = category
    ? 'SELECT * FROM products WHERE category_id = ? AND in_stock = 1 ORDER BY id DESC'
    : 'SELECT * FROM products WHERE in_stock = 1 ORDER BY id DESC';
  const rows = category
    ? db.prepare(sql).all(category)
    : db.prepare(sql).all();
  res.json(rows);
});

router.get('/all', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url, in_stock } = req.body;
  if (!category_id || !name_lv || !name_ru || !name_en || price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = db.prepare(
    'INSERT INTO products (category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url, in_stock) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(category_id, name_lv, name_ru, name_en, desc_lv||'', desc_ru||'', desc_en||'', price, image_url||'', in_stock ?? 1);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url, in_stock, category_id } = req.body;
  db.prepare(
    'UPDATE products SET category_id=?, name_lv=?, name_ru=?, name_en=?, desc_lv=?, desc_ru=?, desc_en=?, price=?, image_url=?, in_stock=? WHERE id=?'
  ).run(category_id, name_lv, name_ru, name_en, desc_lv||'', desc_ru||'', desc_en||'', price, image_url||'', in_stock ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
