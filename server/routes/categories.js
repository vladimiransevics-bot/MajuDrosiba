const express = require('express');
const db = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(rows);
});

module.exports = router;
