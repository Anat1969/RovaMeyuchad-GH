"""בונה את src/data/publicData.ts: כל תאי השטח של תכנית 3/124/03/3 שאינם מגרשי המגורים.

שימוש:
  python3 tools/build-public.py <קובץ DXF של "חלקות חדשות"> src/data/quarterData.ts src/data/publicData.ts

הגיאומטריה: שכבת pcell בשרטוט "260721_חלקות חדשות" (הומר מ-DWG ל-DXF בעזרת LibreDWG), ברשת ישראל החדשה.
הזכויות: טבלת הזכויות בהוראות תכנית 3/124/03/3, עמ' 33 ו-34 (סרוקה, הוקלדה ידנית כאן).
השיוך של מצולע למספר תא שטח נעשה מול תשריט המצב המאושר, לפי מיקום ושטח.
דורש: pip install ezdxf shapely
"""
import json, sys
import ezdxf
from shapely.geometry import Polygon

# מספר תא שטח -> (סוג, שטח בטבלה במ"ר, זכויות)
PUB = dict(main=160, service=40, total=280, coverage=50)
EDU = dict(main=180, service=93, total=583, coverage=50, height=40, floors=10, below=3, units=450, dormArea=22500)
RIGHTS = {
    '301': ('public', 2074, dict(PUB, height=16, floors=4, below=1)),
    '302': ('public', 6965, dict(PUB, height=16, floors=6, below=1)),
    '303': ('public', 11889, dict(PUB, height=24, floors=6, below=1)),
    '304': ('public', 22000, dict(PUB, height=6, floors=6, below=1,
                                  note='בטבלה: גובה 6 מ\' עם 6 קומות. הנתונים אינם מתיישבים, וייתכן שיבוש בסריקה. לאמת מול המקור.')),
    '306': ('public', 9000, dict(PUB, height=24, floors=6, below=1)),
    '307': ('public', 33179, dict(PUB, height=40, floors=10, below=3)),
    '305': ('education', 100896, dict(EDU)),
    '308': ('education', 46497, dict(EDU)),
    '701': ('dorms', 5267, dict(mainArea=27900, total=1034.19, coverage=60, height=82, floors=24, below=3, units=450,
                                note='מסחר 5,400 מ"ר ומעונות 22,500 מ"ר, שטח עיקרי.')),
    '702': ('dorms', 5000, dict(mainArea=27900, total=1075.8, coverage=60, height=82, floors=24, below=3, units=450,
                                note='מסחר 5,400 מ"ר ומעונות 22,500 מ"ר, שטח עיקרי.')),
    '801': ('mixed', 4199, dict(mainArea=8000, total=455.78, coverage=60, height=28, floors=6, below=2,
                                note='מסחר 2,000 מ"ר ותעסוקה 6,000 מ"ר. השיוך של המצולע למספר 801 נעשה בדרך האלימינציה, ולא נקרא מהתשריט.')),
    '802': ('mixed', 3000, dict(mainArea=3900, total=260.53, coverage=60, height=16, floors=3, below=1,
                                note='מסחר 1,300 מ"ר ותעסוקה 2,600 מ"ר.')),
    '901': ('facility', 7638, dict(main=30, service=30, total=110, coverage=60, height=6, floors=1, below=1)),
    '203': ('open', 12875, {}), '204': ('open', 2108, {}), '205': ('open', 2396, {}),
    '206': ('open', 2462, {}), '207': ('open', 4293, {}), '208': ('open', 1594, {}),
    '1000': ('forest', 95316, {}),
    '201-202': ('openland', None, {}),
}
# מספר תא שטח -> שטח המצולע בשרטוט (מ"ר, מעוגל), כמזהה
BY_AREA = {'301': 2053, '302': 6867, '303': 16697, '304': 16714, '305': 99753, '306': 9195, '307': 33420, '308': 43979,
           '701': 5429, '702': 5166, '801': 4244, '802': 2932, '901': 7697, '203': 14212, '204': 2047, '205': 2404,
           '206': 2472, '207': 4360, '208': 1514, '1000': 95154, '201-202': 99129}
SKIP = {718205, 633701, 4608, 2129}  # גבולות התכנית, ומגרשי המגורים 620 ו-621 לפני האיחוד


def main(dxf, quarter_ts, out):
    q = json.loads(open(quarter_ts, encoding='utf-8').read().split('= ', 1)[1].rstrip().rstrip(';'))
    ox, oy = q['origin']
    res = [Polygon([(x + ox, y + oy) for x, y in l['ring']]) for l in q['lots']]
    polys = []
    for e in ezdxf.readfile(dxf).modelspace():
        if e.dxf.layer != 'pcell':
            continue
        pts = [(p[0], p[1]) for p in e.get_points()] if e.dxftype() == 'LWPOLYLINE' else \
              [(v.dxf.location[0], v.dxf.location[1]) for v in e.vertices]
        if len(pts) >= 3:
            p = Polygon(pts).buffer(0)
            if p.area > 100 and p.geom_type == 'Polygon':
                polys.append(p)
    by_area = {round(p.area): p for p in polys}
    used, lots = set(), []
    for num, area in BY_AREA.items():
        p = by_area[area]
        used.add(area)
        kind, table, r = RIGHTS[num]
        lots.append({'num': num, 'kind': kind, 'areaDrawn': area, 'areaTable': table,
                     'ring': [[round(x - ox, 1), round(y - oy, 1)] for x, y in p.simplify(0.3).exterior.coords], **r})
    roads = []
    for p in polys:
        a = round(p.area)
        c = p.representative_point()
        if a in used or a in SKIP or any(r.contains(c) and abs(r.area - p.area) / r.area < 0.25 for r in res):
            continue
        roads.append([[round(x - ox, 1), round(y - oy, 1)] for x, y in p.simplify(0.5).exterior.coords])
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// נוצר אוטומטית על ידי tools/build-public.py. לא לערוך ידנית.\n')
        f.write("import type { PublicData } from '../types/plan';\n\n")
        f.write('export const PUBLIC: PublicData = ')
        f.write(json.dumps({'lots': lots, 'roads': roads}, ensure_ascii=False, separators=(',', ':')))
        f.write(';\n')
    print('lots', len(lots), 'roads', len(roads))
    for l in lots:
        if l['areaTable'] and abs(l['areaDrawn'] - l['areaTable']) / l['areaTable'] > 0.05:
            print('  area differs', l['num'], l['areaDrawn'], l['areaTable'])


if __name__ == '__main__':
    main(*sys.argv[1:4])
