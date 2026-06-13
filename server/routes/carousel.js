const express = require('express');
const db = require('../database');
const router = express.Router();

router.get('/:service', (req, res) => {
  // in_stock=0 продукты тоже показываются в карусели (с пометкой "Pēc pasūtījuma")
  const rows = db.prepare(`
    SELECT p.* FROM products p
    JOIN service_carousels sc ON p.id = sc.product_id
    WHERE sc.service_slug = ?
    ORDER BY sc.position ASC LIMIT 10
  `).all(req.params.service);
  res.json(rows);
});

router.put('/:service', (req, res) => {
  const { service } = req.params;
  const ids = (req.body.product_ids || []).slice(0, 10);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM service_carousels WHERE service_slug = ?').run(service);
    const ins = db.prepare('INSERT INTO service_carousels (service_slug, product_id, position) VALUES (?,?,?)');
    ids.forEach((id, i) => ins.run(service, id, i));
  });
  tx();
  res.json({ ok: true });
});

module.exports = router;
