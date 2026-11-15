"""בונה את src/data/demData.ts: רשת גבהים של פני הקרקע הקיימים, לניתוח הניקוז.

מקור: אריחי הגובה הפתוחים "Terrarium" (Mapzen / AWS Open Data), רמה 14, שמבוססים על SRTM (רזולוציה של כ-30 מ').
שימוש:
  python3 tools/build-dem.py <תיקייה עם האריחים t_X_Y.png> src/data/quarterData.ts src/data/publicData.ts src/data/demData.ts
הורדת אריח: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/<X>/<Y>.png
דורש: pip install pyproj pillow numpy
"""
import json, math, os, sys
import numpy as np
from PIL import Image
from pyproj import Transformer

Z, CELL, PAD = 14, 12.0, 90.0


def load(ts):
    return json.loads(open(ts, encoding='utf-8').read().split('= ', 1)[1].rstrip().rstrip(';'))


def main(tiles_dir, quarter_ts, public_ts, out):
    q, pub = load(quarter_ts), load(public_ts)
    ox, oy = q['origin']
    pts = [p for l in q['lots'] for p in l['ring']] + [p for l in pub['lots'] for p in l['ring']]
    x0 = math.floor(min(p[0] for p in pts) - PAD); x1 = math.ceil(max(p[0] for p in pts) + PAD)
    y0 = math.floor(min(p[1] for p in pts) - PAD); y1 = math.ceil(max(p[1] for p in pts) + PAD)
    nx, ny = int((x1 - x0) / CELL) + 1, int((y1 - y0) / CELL) + 1
    to_wgs = Transformer.from_crs(2039, 4326, always_xy=True)
    cache = {}

    def height(lx, ly):
        lon, lat = to_wgs.transform(lx + ox, ly + oy)
        n = 2 ** Z
        fx = (lon + 180) / 360 * n
        fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
        tx, ty = int(fx), int(fy)
        if (tx, ty) not in cache:
            a = np.asarray(Image.open(os.path.join(tiles_dir, f't_{tx}_{ty}.png')).convert('RGB'), dtype=np.float64)
            cache[(tx, ty)] = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
        a = cache[(tx, ty)]
        px, py = min(255, int((fx - tx) * 256)), min(255, int((fy - ty) * 256))
        return a[py, px]

    # שורה 0 היא הדרומית. החלקה קלה, כי המקור גס מהרשת
    g = np.array([[height(x0 + i * CELL, y0 + j * CELL) for i in range(nx)] for j in range(ny)])
    k = np.pad(g, 1, mode='edge')
    g = sum(k[1 + dj:1 + dj + ny, 1 + di:1 + di + nx] for dj in (-1, 0, 1) for di in (-1, 0, 1)) / 9
    with open(out, 'w', encoding='utf-8') as f:
        f.write('// נוצר אוטומטית על ידי tools/build-dem.py. לא לערוך ידנית.\n')
        f.write('// גובה פני הקרקע הקיימים, במטרים מעל פני הים. שורה 0 היא הדרומית.\n')
        f.write('export const DEM = ')
        f.write(json.dumps({'x0': x0, 'y0': y0, 'cell': CELL, 'nx': nx, 'ny': ny,
                            'h': [round(float(v), 1) for v in g.flatten()]}, separators=(',', ':')))
        f.write(';\n')
    print('grid', nx, ny, 'height range', round(float(g.min()), 1), round(float(g.max()), 1), 'bounds', x0, x1, y0, y1)


if __name__ == '__main__':
    main(*sys.argv[1:5])
