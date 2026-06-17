const express = require('express');
const db = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { id, name_lv, name_ru, name_en, parent_id, sort_order } = req.body || {};
  if (!id || !name_lv || !name_ru || !name_en) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (parent_id && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(parent_id)) {
    return res.status(400).json({ error: 'parent_id does not exist' });
  }
  try {
    db.prepare(
      'INSERT INTO categories (id, name_lv, name_ru, name_en, parent_id, sort_order) VALUES (?,?,?,?,?,?)'
    ).run(id.trim(), name_lv, name_ru, name_en, parent_id || null, sort_order || 0);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

function wouldCycle(catId, newParent) {
  let cur = newParent;
  const seen = new Set();
  while (cur) {
    if (cur === catId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    const p = db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(cur);
    cur = p ? p.parent_id : null;
  }
  return false;
}

router.put('/:id', (req, res) => {
  const { name_lv, name_ru, name_en, parent_id, sort_order } = req.body || {};
  if (!name_lv || !name_ru || !name_en) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (parent_id && wouldCycle(req.params.id, parent_id)) {
    return res.status(400).json({ error: 'cycle detected' });
  }
  try {
    db.prepare(
      'UPDATE categories SET name_lv=?, name_ru=?, name_en=?, parent_id=?, sort_order=? WHERE id=?'
    ).run(name_lv, name_ru, name_en, parent_id || null, sort_order || 0, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const kids = db.prepare('SELECT COUNT(*) n FROM categories WHERE parent_id = ?').get(id).n;
  if (kids) return res.status(400).json({ error: 'has sub-categories' });
  const prods = db.prepare('SELECT COUNT(*) n FROM products WHERE category_id = ?').get(id).n;
  if (prods) return res.status(400).json({ error: 'has products' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
