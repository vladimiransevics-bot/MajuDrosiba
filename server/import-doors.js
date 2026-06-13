/**
 * One-off importer for the 7 metal-door models from the metal-doors landing page.
 * Idempotent: wipes existing 'metal-doors' category products, then re-inserts.
 * Translations are pulled from public/lang/{lv,ru,en}.json (the same keys the
 * metal-doors landing page already uses), so editing the JSON updates both.
 * Run: cd server && node import-doors.js
 */
const fs = require('fs');
const path = require('path');
const db = require('./database');

const langDir = path.join(__dirname, '../public/lang');
const lv = JSON.parse(fs.readFileSync(path.join(langDir, 'lv.json'), 'utf8'));
const ru = JSON.parse(fs.readFileSync(path.join(langDir, 'ru.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(langDir, 'en.json'), 'utf8'));

// Insertion order is reversed so STANDART (last in) has the highest id and
// shows first in the shop (products ordered by id DESC in products.js).
// DIVVIRU is intentionally excluded — it is priced per m² and quoted individually
// via the "Calculate" CTA on the metal-doors landing page, so it doesn't fit the
// fixed-price shop card model.
const DOORS = [
  { name: 'SKANDI INOX PLUSS', image: '/images/doors/6.jpg', price: 750, feats: ['d_skip_f1','d_skip_f2','d_skip_f3','d_skip_f4','d_skip_f5'] },
  { name: 'SKANDI INOX',       image: '/images/doors/5.jpg', price: 700, feats: ['d_ski_f1','d_ski_f2','d_ski_f3','d_ski_f4','d_ski_f5'] },
  { name: 'SKANDI',            image: '/images/doors/4.png', price: 640, feats: ['d_sk_f1','d_sk_f2','d_sk_f3','d_sk_f4','d_sk_f5'] },
  { name: 'PREMIUM',           image: '/images/doors/1.png', price: 610, feats: ['d_prem_f1','d_prem_f2','d_prem_f3','d_prem_f4','d_prem_f5','d_prem_f6'] },
  { name: 'BEST',              image: '/images/doors/2.png', price: 580, feats: ['d_best_f1','d_best_f2','d_best_f3','d_best_f4','d_best_f5','d_best_f6'] },
  { name: 'STANDART',          image: '/images/doors/3.png', price: 520, feats: ['d_std_f1','d_std_f2','d_std_f3','d_std_f4','d_std_f5','d_std_f6'] },
];

function descHtml(t, door) {
  const lis = door.feats.map(k => `<li>${t[k] || k}</li>`).join('');
  const intro = door.descKey && t[door.descKey] ? `<p>${t[door.descKey]}</p>` : '';
  return intro + `<ul>${lis}</ul>`;
}

function nameFor(t, door) {
  return door.nameKey && t[door.nameKey] ? t[door.nameKey] : door.name;
}

const tx = db.transaction(() => {
  const removed = db.prepare("DELETE FROM products WHERE category_id='metal-doors'").run();
  console.log(`Cleared ${removed.changes} existing metal-doors products`);

  const insert = db.prepare(
    'INSERT INTO products (category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url) VALUES (?,?,?,?,?,?,?,?,?)'
  );

  DOORS.forEach(door => {
    insert.run(
      'metal-doors',
      nameFor(lv, door), nameFor(ru, door), nameFor(en, door),
      descHtml(lv, door), descHtml(ru, door), descHtml(en, door),
      door.price,
      door.image
    );
    console.log(`  + ${door.name}  ${door.price}€  ${door.image}`);
  });
});

tx();
console.log(`\nDone. ${DOORS.length} door products inserted.`);
