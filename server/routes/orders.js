const express = require('express');
const db = require('../database');
const router = express.Router();

router.post('/', (req, res) => {
  const {
    name, phone, email, address, items, total, notes,
    customer_type, company_name, reg_nr, vat_nr, legal_address,
  } = req.body;
  if (!name || !phone || !items || total == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const cType = customer_type === 'legal' ? 'legal' : 'individual';
  if (cType === 'legal' && (!company_name || !reg_nr || !legal_address)) {
    return res.status(400).json({ error: 'Missing company name, registration number or legal address' });
  }
  const result = db.prepare(
    'INSERT INTO orders (name, phone, email, address, items, total, notes, customer_type, company_name, reg_nr, vat_nr, legal_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(
    name, phone, email||'', address||'', JSON.stringify(items), total, notes||'',
    cType,
    cType === 'legal' ? company_name : '',
    cType === 'legal' ? reg_nr : '',
    cType === 'legal' ? (vat_nr || '') : '',
    cType === 'legal' ? legal_address : ''
  );
  res.json({ id: result.lastInsertRowid });
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
