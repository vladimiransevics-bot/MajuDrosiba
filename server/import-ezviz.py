#!/usr/bin/env python3
"""
One-off importer for EZVIZ products from the EZVIZ_cenas_(v1.12).xlsx pricelist.
Idempotent: removes any previously-inserted EZVIZ products before inserting fresh.
Run:  python3 import-ezviz.py
"""
import openpyxl, sqlite3, urllib.request, re, time, sys, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
XLSX = os.path.join(ROOT, 'EZVIZ_cenas_(v1.12).xlsx')
DB   = os.path.join(ROOT, 'server', 'majudrosiba.sqlite')

# The XLSX explicitly states "Cenas norādītas bez PVN" — MSRP is excluding VAT.
# We store excl-VAT prices in the DB; the catalog UI has a toggle that adds the
# 21% Latvian VAT at display time (see public/js/price.js).
VAT_RATE = 0.21  # documented for reference; NOT applied on import.


def clean_name(model: str) -> str:
    n = re.sub(r'\s+', ' ', str(model)).strip()
    n = re.sub(r'^CS\s*-?\s*', '', n, flags=re.IGNORECASE)
    n = re.sub(r'\s*-\s*', '-', n)             # tighten dashes inside model codes
    n = re.sub(r'\(', ' (', n)                 # ensure space before "("
    n = re.sub(r'\s+', ' ', n).strip()
    return f'EZVIZ {n}'


def short_desc(text: str, maxlen: int = 220) -> str:
    if not text:
        return ''
    t = re.sub(r'\s+', ' ', str(text)).strip()
    if len(t) <= maxlen:
        return t
    cut = t[:maxlen]
    if ' ' in cut[-40:]:
        cut = cut.rsplit(' ', 1)[0]
    return cut + '…'


OG_PATTERNS = [
    re.compile(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I),
]
# ezviz.com lazy-loads images: nav-menu icons all carry ?ver= cache-bust,
# product hero/gallery images do not.
DATA_SRC_RE = re.compile(r'data-src="(//mfs\.ezvizlife\.com/[a-f0-9]+\.[a-z]+(?:\?[^"]*)?)"', re.I)


def fetch_product_image(url: str) -> str:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
        with urllib.request.urlopen(req, timeout=12) as r:
            html = r.read().decode('utf-8', errors='replace')
        for pat in OG_PATTERNS:
            m = pat.search(html)
            if m:
                return m.group(1).strip()
        # Fallback for ezviz.com (SPA): first data-src image without ?ver= cache-bust
        for src in DATA_SRC_RE.findall(html):
            if '?ver=' not in src:
                return 'https:' + src
    except Exception as e:
        print(f'    ! fetch fail: {e}', file=sys.stderr)
    return ''


def categorize(sheet: str, model: str, desc: str) -> str:
    if sheet == 'CCTV Systems':
        return 'video'
    d = (desc or '').lower()
    m = (model or '').upper()
    # Smart locks
    if 'slēdzen' in d or ' lock' in d or re.search(r'\bDL\d', m):
        return 'locks'
    # Everything else in Smart home (doorbells, sensors, hubs, plugs, kits) → access-control
    return 'access-control'


def main():
    print('=== Parse XLSX ===')
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    products = []
    for sheet in ['CCTV Systems', 'Smart home']:
        ws = wb[sheet]
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:
                continue
            model = row[0]; desc = row[3]; msrp = row[5]; url = row[6]
            if not model or msrp is None:
                continue
            products.append({
                'sheet': sheet,
                'model': str(model),
                'desc':  str(desc) if desc else '',
                'price': float(msrp),  # MSRP excl. VAT — UI adds VAT at render time
                'url':   str(url) if url else '',
            })
    print(f'  {len(products)} products parsed')

    print('\n=== Fetch og:image from product URLs ===')
    for i, p in enumerate(products):
        label = f'[{i+1:2d}/{len(products)}] {p["model"][:42]:42s}'
        if not p['url']:
            p['image'] = ''
            print(f'  {label} → no URL')
            continue
        sys.stdout.write(f'  {label} → ')
        sys.stdout.flush()
        p['image'] = fetch_product_image(p['url'])
        print('OK' if p['image'] else '(no og:image)')
        time.sleep(0.3)

    print('\n=== Insert into DB ===')
    conn = sqlite3.connect(DB, timeout=10)
    cur = conn.cursor()

    res = cur.execute("""
        DELETE FROM products
         WHERE name_lv LIKE 'EZVIZ %'
            OR (image_url LIKE '%ezviz%' AND image_url NOT LIKE '/uploads/%')
            OR (image_url LIKE '%ezvizlife%')
    """)
    print(f'  Cleared {res.rowcount} prior EZVIZ rows')

    inserted = 0
    for p in products:
        name = clean_name(p['model'])
        desc_lv = short_desc(p['desc'])
        category = categorize(p['sheet'], p['model'], p['desc'])
        cur.execute(
            '''INSERT INTO products
               (category_id, name_lv, name_ru, name_en, desc_lv, desc_ru, desc_en, price, image_url)
               VALUES (?,?,?,?,?,?,?,?,?)''',
            (category, name, name, name, desc_lv, '', '', p['price'], p['image'])
        )
        inserted += 1
    conn.commit()

    print(f'\n=== Done. Inserted {inserted}. Per category: ===')
    for row in conn.execute("SELECT category_id, COUNT(*) FROM products GROUP BY category_id ORDER BY category_id"):
        print(f'  {row[0]:18s} → {row[1]}')
    conn.close()


if __name__ == '__main__':
    main()
