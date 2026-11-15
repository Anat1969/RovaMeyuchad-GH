"""בונה את src/data/quarterData.ts מקובצי התכנית 603-0811588 (מאתר תכנון זמין).

שימוש:
  python3 tools/build-quarter.py <תיקיית SHP> <קובץ זכויות והוראות בניה XLS> <קובץ פלט>

בתיקיית ה-SHP נדרשים MVT_PLAN (תאי שטח), MVT_POL (זיקות הנאה) ו-MVT_ARC (קווי בניין וחזית מסחרית).
הקואורדינטות ברשת ישראל החדשה, ומוזזות למרכז התכנית. היחידות: מטרים.
דורש: pip install pyshp
"""
import json, os, re, sys
from collections import Counter
from html.parser import HTMLParser
import shapefile


class Table(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        elif tag in ('td', 'th') and self.row is not None:
            self.cell = ''

    def handle_endtag(self, tag):
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None
        elif tag in ('td', 'th') and self.cell is not None and self.row is not None:
            self.row.append(re.sub(r'\s+', ' ', self.cell).strip())
            self.cell = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data


def num(text):
    """'(3) 53' -> 53.0 ; '(5)' -> None"""
    t = re.sub(r'\(\d+\)', '', text).strip()
    try:
        return float(t)
    except ValueError:
        return None


def reader(folder, name):
    def f(ext):
        return open(os.path.join(folder, f'{name}.{ext}'), 'rb')
    return shapefile.Reader(shp=f('shp'), dbf=f('dbf'), shx=f('shx'), encoding='utf-8')


def main(shp_dir, xls_path, out_path):
    raw = open(xls_path, 'rb').read()
    try:
        html = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        html = raw.decode('cp1255')
    t = Table()
    t.feed(html)
    rights = {}
    for r in t.rows:
        if len(r) != 21 or not r[3].isdigit():
            continue
        use, lot = r[2], r[3]
        d = rights.setdefault(lot, {})
        if use == 'מסחר':
            d['commerceMain'] = num(r[6])
            d['commerceService'] = num(r[7])
            continue
        if use == 'מגורים':
            d['units'] = num(r[12]) or d.get('units')
            d['density'] = num(r[13]) or d.get('density')
            d['mainArea'] = num(r[6])
            d['serviceArea'] = num(r[7])
        # שורת מגורים במגרש מגורים בלבד, או שורת "סך הכל" במגרש מעורב
        if num(r[14]) is not None:
            d['lotArea'] = num(r[5])
            d['coverage'] = num(r[11])
            d['height'] = num(r[14])
            d['floors'] = num(r[15])
            d['floorsBelow'] = num(r[16])
            d['totalPct'] = num(r[10])

    plan = reader(shp_dir, 'MVT_PLAN')
    xs, ys = [], []
    for s in plan.shapes():
        xs += [p[0] for p in s.points]
        ys += [p[1] for p in s.points]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    local = lambda pts: [[round(x - cx, 1), round(y - cy, 1)] for x, y in pts]

    def outer(shape):
        parts = list(shape.parts) + [len(shape.points)]
        return local(shape.points[parts[0]:parts[1]])

    lots = []
    for sr in plan.shapeRecords():
        rec = sr.record.as_dict()
        n = rec['NUM']
        d = rights[n]
        i = lambda k: int(d[k]) if d.get(k) is not None else None
        lots.append({
            'num': n,
            'ring': outer(sr.shape),
            'calcArea': round(rec['CALC_AREA']),
            'lotArea': i('lotArea'),
            'mixed': 'commerceMain' in d,
            'coverage': d['coverage'],
            'units': i('units'),
            'density': d['density'],
            'height': d['height'],
            'floors': i('floors'),
            'floorsBelow': i('floorsBelow'),
            'mainArea': i('mainArea'),
            'commerceMain': i('commerceMain'),
            'totalPct': d['totalPct'],
        })
    lots.sort(key=lambda l: l['num'])

    easements = [outer(sr.shape) for sr in reader(shp_dir, 'MVT_POL').shapeRecords()
                 if sr.record.as_dict()['MAVAT_NAME'] == 'זיקת הנאה']

    arcs = reader(shp_dir, 'MVT_ARC')
    kinds = Counter(r.as_dict()['MAVAT_NAME'] for r in arcs.records())
    building_lines, fronts = [], []
    for sr in arcs.shapeRecords():
        name = sr.record.as_dict()['MAVAT_NAME']
        target = building_lines if name.startswith('קו בנין') else fronts if name == 'חזית מסחרית' else None
        if target is None:
            continue
        parts = list(sr.shape.parts) + [len(sr.shape.points)]
        for a, b in zip(parts, parts[1:]):
            target.append(local(sr.shape.points[a:b]))

    data = {'origin': [round(cx, 1), round(cy, 1)], 'lots': lots, 'easements': easements,
            'buildingLines': building_lines, 'commercialFronts': fronts}
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('// נוצר אוטומטית על ידי tools/build-quarter.py מקובצי התכנית 603-0811588. לא לערוך ידנית.\n')
        f.write("import type { QuarterData } from '../types/plan';\n\n")
        f.write('export const QUARTER: QuarterData = ')
        f.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        f.write(';\n')
    print('lots', len(lots), 'mixed', sum(l['mixed'] for l in lots), 'units', sum(l['units'] for l in lots),
          'easements', len(easements), 'building lines', len(building_lines))
    print('arc kinds', dict(kinds))
    print('heights', sorted({l['height'] for l in lots}), 'floors', sorted({l['floors'] for l in lots}))
    print('missing', [l['num'] for l in lots if None in (l['units'], l['height'], l['floors'], l['coverage'])])


if __name__ == '__main__':
    main(*sys.argv[1:4])
