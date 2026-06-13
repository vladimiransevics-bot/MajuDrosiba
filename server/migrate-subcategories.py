#!/usr/bin/env python3
"""
One-off migration: add sensible sub-categories under each top-level category
and re-classify existing products into them based on model-name patterns.

Idempotent — safe to re-run; uses INSERT OR IGNORE for sub-categories.
"""
import sqlite3, os, re

DB = os.path.join(os.path.dirname(__file__), 'majudrosiba.sqlite')

# (id, parent_id, name_lv, name_ru, name_en, sort_order)
SUBCATS = [
    # video
    ('video-cameras',     'video',          'Kameras',              'Камеры',              'Cameras',          1),
    ('video-accessories', 'video',          'Aksesuāri',            'Аксессуары',          'Accessories',      2),
    # access-control
    ('access-doorbells',  'access-control', 'Durvju zvani',         'Дверные звонки',      'Doorbells',        1),
    ('access-alarm',      'access-control', 'Signalizācijas',       'Сигнализации',        'Alarm systems',    2),
    ('access-readers',    'access-control', 'Karšu lasītāji',       'Кардридеры',          'Card readers',     3),
    ('access-other',      'access-control', 'Cita',                 'Другое',              'Other',            4),
    # locks
    ('locks-smart',       'locks',          'Viedās slēdzenes',     'Умные замки',         'Smart locks',      1),
    ('locks-mechanical',  'locks',          'Mehāniskās slēdzenes', 'Механические замки',  'Mechanical locks', 2),
    ('locks-handles',     'locks',          'Furnitūra',            'Фурнитура',           'Door hardware',    3),
]


def classify(category_id, name, image_url):
    """Return the most specific sub-category id for a product."""
    n = (name or '').upper()
    u = (image_url or '').lower()

    if category_id == 'video':
        if re.search(r'\b(CARDT|PSP\d|PBC\d|PCA\d|CMT[- ]|DL-IC)', n):
            return 'video-accessories'
        return 'video-cameras'

    if category_id == 'access-control':
        if re.search(r'\b(DB2|DP2|HP7|DB1)', n) or 'doorbell' in n.lower() or 'durvju zvan' in u:
            return 'access-doorbells'
        if re.search(r'\b(T\d+C|TS\d|RA-|RE\d|RS\d|A3)\b', n):
            return 'access-alarm'
        if 'karsu-lasitajs' in u or 'reader' in n.lower():
            return 'access-readers'
        return 'access-other'

    if category_id == 'locks':
        if re.search(r'\b(DL01|DL05|TEDEE|TX/A3|GO2|PRO)', n) or 'tedee' in u:
            return 'locks-smart'
        if 'rokturis' in u or 'handle' in n.lower():
            return 'locks-handles'
        return 'locks-mechanical'

    # safes, fire-alarm, metal-doors → keep at top-level
    return category_id


def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    print('── Seed sub-categories ──')
    inserted = 0
    for row in SUBCATS:
        try:
            cur.execute(
                'INSERT INTO categories (id, parent_id, name_lv, name_ru, name_en, sort_order) VALUES (?,?,?,?,?,?)',
                (row[0], row[1], row[2], row[3], row[4], row[5])
            )
            inserted += 1
        except sqlite3.IntegrityError:
            # already exists
            pass
    conn.commit()
    print(f'  Inserted {inserted} new sub-categories (others already existed)')

    print('\n── Reclassify products ──')
    changes = {}
    for r in cur.execute('SELECT id, category_id, name_lv, image_url FROM products').fetchall():
        pid, cat, name, img = r
        new_cat = classify(cat, name, img)
        if new_cat != cat:
            cur.execute('UPDATE products SET category_id=? WHERE id=?', (new_cat, pid))
            changes[new_cat] = changes.get(new_cat, 0) + 1
    conn.commit()
    for k, v in sorted(changes.items()):
        print(f'  {v:3d} → {k}')

    print('\n── Visible products per category ──')
    sql = """
      SELECT c.parent_id, c.id, c.name_en, COUNT(p.id) n
        FROM categories c
   LEFT JOIN products p ON p.category_id = c.id AND p.in_stock = 1
    GROUP BY c.id
    ORDER BY COALESCE(c.parent_id, c.id), c.sort_order, c.id
    """
    for r in cur.execute(sql):
        prefix = '  ↳ ' if r[0] else ''
        print(f'  {prefix}{r[2]:25s} ({r[1]:20s})  n={r[3]}')

    conn.close()


if __name__ == '__main__':
    main()
