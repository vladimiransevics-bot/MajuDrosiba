#!/usr/bin/env python3
"""
Restore full EZVIZ product descriptions from the source XLSX.

The original import-ezviz.py truncated descriptions to 220 chars and collapsed
all whitespace. This script writes the full text back into desc_lv only, with
newlines converted to <br> so the modal/card render preserves structure.

Touches ONLY desc_lv. Does not modify desc_ru, desc_en, image_url, price,
category_id, sku, display_order, in_stock. Idempotent — safe to re-run.

Run:  python3 server/update-ezviz-descriptions.py
"""
import openpyxl, sqlite3, re, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
XLSX = os.path.join(ROOT, 'EZVIZ_cenas_(v1.12).xlsx')
DB   = os.path.join(ROOT, 'server', 'majudrosiba.sqlite')


def clean_name(model: str) -> str:
    """Same logic as import-ezviz.py to keep name_lv matching."""
    n = re.sub(r'\s+', ' ', str(model)).strip()
    n = re.sub(r'^CS\s*-?\s*', '', n, flags=re.IGNORECASE)
    n = re.sub(r'\s*-\s*', '-', n)
    n = re.sub(r'\(', ' (', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return f'EZVIZ {n}'


def normalize_desc(text: str) -> str:
    """Preserve line structure, escape nothing (Excel text is trusted), return HTML with <br>."""
    t = str(text)
    t = t.replace('\xa0', ' ')          # NBSP → space
    t = t.replace('\r\n', '\n').replace('\r', '\n')
    t = re.sub(r'[ \t]+', ' ', t)        # collapse horizontal whitespace only
    t = re.sub(r'\n{3,}', '\n\n', t)     # cap blank lines
    lines = [ln.strip() for ln in t.split('\n')]
    lines = [ln for ln in lines if ln]
    return '<br>'.join(lines)


def main():
    if not os.path.exists(XLSX):
        sys.exit(f'XLSX not found: {XLSX}')
    if not os.path.exists(DB):
        sys.exit(f'DB not found: {DB}')

    wb = openpyxl.load_workbook(XLSX, data_only=True)
    rows = []
    for sheet in ['CCTV Systems', 'Smart home']:
        ws = wb[sheet]
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:
                continue
            model, desc = row[0], row[3]
            if not model:
                continue
            rows.append((str(model), str(desc) if desc else ''))
    print(f'Parsed {len(rows)} rows from XLSX')

    conn = sqlite3.connect(DB, timeout=10)
    cur  = conn.cursor()

    updated = not_found = skipped = 0
    missing = []
    for model, raw_desc in rows:
        if not raw_desc.strip():
            skipped += 1
            continue
        name_lv = clean_name(model)
        html = normalize_desc(raw_desc)
        cur.execute('UPDATE products SET desc_lv = ? WHERE name_lv = ?', (html, name_lv))
        if cur.rowcount > 0:
            updated += 1
        else:
            not_found += 1
            missing.append((model, name_lv))
    conn.commit()
    conn.close()

    print(f'Updated:   {updated}')
    print(f'Not found: {not_found}')
    print(f'Skipped (empty desc): {skipped}')
    if missing:
        print('\nNot found in DB (model → expected name_lv):')
        for m, n in missing:
            print(f'  {m:35s} → {n}')


if __name__ == '__main__':
    main()
