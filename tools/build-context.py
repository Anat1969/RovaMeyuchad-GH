"""בונה את src/data/contextData.ts: הקונטקסט העירוני סביב התכנית.

מקור הרחובות והרובעים: האפליקציה RechovNumbers-GH (public/data/snapshot.json, src/data/quarters.ts).
שימוש:
  python3 tools/build-context.py <snapshot.json> <quarters.ts> src/data/quarterData.ts src/data/contextData.ts

הפלט, במטרים יחסית למרכז התכנית (x מזרח, y צפון):
  streets   כל רחובות אשדוד, עם שם, רובע ורוחב סכמטי לפי סיווג הדרך
  quarters  שם כל רובע ונקודת מרכז, מחושבת מהרחובות שלו (אין במקור גבולות רובעים)
  planRuns  קטעי הרחובות שבטווח 70 מ' ממגרשי התכנית, בדגימה כל 6 מ' (לשכבות הפיתוח)
  tiles     אריחי תצלום אוויר (z, x, y) וארבע הפינות של כל אריח
דורש: pip install pyproj shapely
"""
import json, math, re, sys
from statistics import median
from pyproj import Transformer
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union

WIDTH = {'primary': 24, 'trunk': 24, 'secondary': 20, 'tertiary': 14, 'residential': 10,
         'unclassified': 10, 'living_street': 7, 'footway': 3, 'pedestrian': 5}
MAIN = {'primary', 'trunk', 'secondary', 'tertiary'}
STEP = 6.0       # מרווח הדגימה, כמרווח בין העצים בתוכנית
NEAR = 70.0      # מרחק מרבי ממגרש כדי שקטע רחוב ייחשב "רחוב של התכנית"


def main(snapshot, quarters_ts, quarter_data, out):
    q = json.loads(open(quarter_data, encoding='utf-8').read().split('= ', 1)[1].rstrip().rstrip(';'))
    cx, cy = q['origin']
    to_itm = Transformer.from_crs(4326, 2039, always_xy=True)
    to_wgs = Transformer.from_crs(2039, 4326, always_xy=True)

    def local(lon, lat):
        x, y = to_itm.transform(lon, lat)
        return x - cx, y - cy

    names = dict(re.findall(r"\['(q-[a-z-]+)', (?:'|\")(.+?)(?:'|\"), ", open(quarters_ts, encoding='utf-8').read()))
    lots = unary_union([Polygon(l['ring']) for l in q['lots']])

    streets, by_q, runs = [], {}, []
    for s in json.load(open(snapshot, encoding='utf-8'))['streets']:
        cls = s['m'].get('class') or 'residential'
        lines = [[local(lon, lat) for lon, lat in part] for part in s['line'] if len(part) > 1]
        if not lines:
            continue
        streets.append({'n': s['name'], 'q': s.get('quarter_id'), 'w': WIDTH.get(cls, 10),
                        'l': [[[round(x), round(y)] for x, y in ln] for ln in lines]})
        if s.get('quarter_id'):
            by_q.setdefault(s['quarter_id'], []).extend(p for ln in lines for p in ln)
        for ln in lines:
            line = LineString(ln)
            run = []
            for i in range(int(line.length // STEP) + 1):
                p = line.interpolate(i * STEP)
                if p.distance(lots) <= NEAR and not lots.contains(p):
                    run.append([round(p.x, 1), round(p.y, 1)])
                else:
                    if len(run) > 3:
                        runs.append({'n': s['name'], 'main': cls in MAIN, 'w': WIDTH.get(cls, 10), 'pts': run})
                    run = []
            if len(run) > 3:
                runs.append({'n': s['name'], 'main': cls in MAIN, 'w': WIDTH.get(cls, 10), 'pts': run})

    quarters = [{'id': k, 'name': names.get(k, k), 'c': [round(median(p[0] for p in v)), round(median(p[1] for p in v))]}
                for k, v in sorted(by_q.items()) if k != 'q-main-axis']

    def tiles(z, x0, y0, x1, y1):
        """האריחים שמכסים את המלבן המקומי, עם פינות כל אריח במטרים מקומיים"""
        n = 2 ** z

        def tile_of(lx, ly):
            lon, lat = to_wgs.transform(lx + cx, ly + cy)
            return (int((lon + 180) / 360 * n),
                    int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n))

        def corner(tx, ty):
            lon = tx / n * 360 - 180
            lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ty / n))))
            x, y = local(lon, lat)
            return [round(x, 1), round(y, 1)]

        (ta, tb), (tc, td) = tile_of(x0, y1), tile_of(x1, y0)
        return [{'z': z, 'x': tx, 'y': ty,
                 'c': [corner(tx, ty), corner(tx + 1, ty), corner(tx + 1, ty + 1), corner(tx, ty + 1)]}
                for tx in range(ta, tc + 1) for ty in range(tb, td + 1)]

    xs = [p[0] for s in streets for ln in s['l'] for p in ln]
    ys = [p[1] for s in streets for ln in s['l'] for p in ln]
    bx0, by0, bx1, by1 = lots.bounds
    tl = (tiles(14, min(xs), min(ys), max(xs), max(ys))
          + tiles(16, bx0 - 1300, by0 - 1300, bx1 + 1300, by1 + 1300)
          + tiles(18, bx0 - 160, by0 - 160, bx1 + 160, by1 + 160))

    data = {'streets': streets, 'quarters': quarters, 'planRuns': runs, 'tiles': tl}
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// נוצר אוטומטית על ידי tools/build-context.py. לא לערוך ידנית.\n')
        f.write("import type { ContextData } from '../types/plan';\n\n")
        f.write('export const CONTEXT: ContextData = ')
        f.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        f.write(';\n')
    from collections import Counter
    print('streets', len(streets), 'quarters', len(quarters), 'runs', len(runs),
          'run points', sum(len(r['pts']) for r in runs), 'tiles', dict(Counter(t['z'] for t in tl)))
    print('run streets', sorted({r['n'] for r in runs}))
    print('city extent', round(min(xs)), round(max(xs)), round(min(ys)), round(max(ys)))


if __name__ == '__main__':
    main(*sys.argv[1:5])
