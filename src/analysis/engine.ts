import { QUARTER } from '../data/quarterData';
import { PUBLIC } from '../data/publicData';
import { KIND } from '../data/publicKinds';
import { CONTEXT } from '../data/contextData';
import { DEM } from '../data/demData';
import { offsetLine, type Pt } from '../components/viewport/geometry';

/**
 * מנוע הניתוחים הסביבתיים: הצללות, רוח, ניקוז וחום.
 * אלה מודלים מפושטים להמחשה ולכיוון תכנוני, ולא סימולציה הנדסית:
 * - הצללות: גיאומטריה מדויקת של השמש מול מעטפות הזכויות ונופי העצים.
 * - רוח: אזור מוגן מאחורי כל בניין ואזור האצה סביב מגדלים. אינו חישוב זרימה (CFD).
 * - ניקוז: כיוון הירידה על פני הקרקע הקיימים (SRTM, כ-30 מ'). לא הטופוגרפיה המתוכננת.
 * - חום: מדד של חשיפה לשמש כפול סוג המשטח. אינו טמפרטורה.
 */
export type Analysis = 'shade' | 'wind' | 'water' | 'heat';
export type Season = 'summer' | 'equinox' | 'winter';

export const W = (DEM.nx - 1) * DEM.cell; // מטרים, וגם פיקסלים: פיקסל למטר
export const H = (DEM.ny - 1) * DEM.cell;
export const X0 = DEM.x0;
export const Y1 = DEM.y0 + H;
const PW = Math.round(W);
const PH = Math.round(H);
const px = (p: Pt): [number, number] => [p[0] - X0, Y1 - p[1]];

export interface Building {
  ring: Pt[];
  h: number;
}

function centroid(r: Pt[]): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    a += f;
    cx += (r[i][0] + r[i + 1][0]) * f;
    cy += (r[i][1] + r[i + 1][1]) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
const shrink = (r: Pt[], pct: number): Pt[] => {
  const c = centroid(r);
  const k = Math.sqrt(pct / 100);
  return r.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
};

/** מעטפות הזכויות של כל המגרשים הבנויים: מגורים, ציבור, חינוך ומסחר */
export const BUILDINGS: Building[] = [
  ...QUARTER.lots.flatMap((l) => {
    const ring = l.ring as Pt[];
    return l.mixed
      ? [
          { ring: shrink(ring, l.coverage), h: 6 },
          { ring: shrink(ring, 35), h: l.height },
        ]
      : [{ ring: shrink(ring, l.coverage), h: l.height }];
  }),
  ...PUBLIC.lots.filter((l) => KIND[l.kind].built).map((l) => ({ ring: shrink(l.ring as Pt[], l.coverage ?? 50), h: l.height ?? 6 })),
];

/** עצי הרחוב ונקודות המדרכה, לפי אותו כלל שבמודל: עץ כל 6 מ' בשני צדי הרחוב */
export const TREES: Pt[] = [];
export const WALK: { n: string; p: Pt }[] = [];
for (const run of CONTEXT.planRuns) {
  for (const side of [1, -1]) {
    TREES.push(...offsetLine(run.pts as Pt[], side * (run.w / 2 + 1.1)));
    offsetLine(run.pts as Pt[], side * (run.w / 2 + 4.4)).forEach((p) => WALK.push({ n: run.n, p }));
  }
}

// ---------- שמש
const LAT = (31.78 * Math.PI) / 180;
const DECL: Record<Season, number> = { summer: 23.44, equinox: 0, winter: -23.44 };
export const SEASON_NAME: Record<Season, string> = { summer: '21 ביוני', equinox: '21 במרץ', winter: '21 בדצמבר' };

/** גובה השמש ואזימוט (מדרום, חיובי למערב), ברדיאנים, לפי שעון שמש */
export function sun(season: Season, hour: number) {
  const d = (DECL[season] * Math.PI) / 180;
  const ha = ((hour - 12) * 15 * Math.PI) / 180;
  const alt = Math.asin(Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.cos(ha));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(LAT) - Math.tan(d) * Math.cos(LAT));
  return { alt, az };
}
/** וקטור אל השמש במערכת המודל (X מזרח, Y גובה, Z דרום) */
export function sunVector(season: Season, hour: number): [number, number, number] {
  const { alt, az } = sun(season, hour);
  return [-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt)];
}

// ---------- גיאומטריה
function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** הצורה שבניין "מטיל" בכיוון נתון: המעטפת הקמורה של טביעת הרגל ושל ההזזה שלה */
const sweep = (ring: Pt[], dx: number, dy: number) => hull([...ring, ...ring.map(([x, y]): Pt => [x + dx, y + dy])]);

function canvas() {
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  return c;
}
function poly(ctx: CanvasRenderingContext2D, ring: Pt[]) {
  ctx.beginPath();
  ring.forEach((p, i) => {
    const [x, y] = px(p);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

// ---------- הצללות
/** מצייר את הצללים של שעה אחת: בניינים ונופי עצים */
function drawShade(ctx: CanvasRenderingContext2D, season: Season, hour: number, color: string) {
  const { alt, az } = sun(season, hour);
  if (alt < 0.07) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, PW, PH);
    return;
  }
  const k = 1 / Math.tan(alt);
  ctx.fillStyle = color;
  for (const b of BUILDINGS) {
    poly(ctx, sweep(b.ring, Math.sin(az) * k * b.h, Math.cos(az) * k * b.h));
    ctx.fill();
  }
  // נוף העץ: גובה כ-4 מ', רדיוס כ-3 מ'
  const tx = Math.sin(az) * k * 4;
  const ty = Math.cos(az) * k * 4;
  ctx.beginPath();
  for (const t of TREES) {
    const [x, y] = px([t[0] + tx, t[1] + ty]);
    ctx.moveTo(x + 3.2, y);
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function shadeNow(season: Season, hour: number) {
  const c = canvas();
  drawShade(c.getContext('2d')!, season, hour, 'rgba(30,34,60,0.62)');
  return c;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const dayCache = new Map<string, Float32Array>();
/** שיעור השעות המוצלות בכל נקודה, בין שעות נתונות. 0 = שמש כל הזמן, 1 = צל כל הזמן */
export function shadeFraction(season: Season, from = 8, to = 16): Float32Array {
  const key = `${season}-${from}-${to}`;
  const hit = dayCache.get(key);
  if (hit) return hit;
  const out = new Float32Array(PW * PH);
  const hours = HOURS.filter((h) => h >= from && h <= to);
  const c = canvas();
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  for (const h of hours) {
    ctx.clearRect(0, 0, PW, PH);
    drawShade(ctx, season, h, '#000');
    const d = ctx.getImageData(0, 0, PW, PH).data;
    for (let i = 0; i < out.length; i++) if (d[i * 4 + 3] > 127) out[i] += 1 / hours.length;
  }
  dayCache.set(key, out);
  return out;
}

// ---------- מפות צבע
type Ramp = [number, number, number][];
export const RAMPS: Record<Analysis, { ramp: Ramp; low: string; high: string }> = {
  shade: { ramp: [[214, 72, 43], [244, 190, 90], [250, 242, 190], [120, 170, 200], [44, 74, 130]], low: 'שמש כל היום', high: 'צל כל היום' },
  wind: { ramp: [[44, 74, 130], [150, 190, 215], [245, 245, 235], [240, 170, 90], [200, 50, 40]], low: 'מוגן מרוח', high: 'רוח מואצת' },
  water: { ramp: [[245, 242, 232], [170, 205, 225], [80, 140, 200], [30, 70, 150], [10, 30, 90]], low: 'מעט נגר', high: 'ריכוז נגר' },
  heat: { ramp: [[44, 74, 130], [120, 170, 200], [250, 242, 190], [244, 160, 70], [200, 40, 35]], low: 'קריר', high: 'חם' },
};
function colorAt(ramp: Ramp, v: number): [number, number, number] {
  const t = Math.max(0, Math.min(0.9999, v)) * (ramp.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  return [0, 1, 2].map((k) => ramp[i][k] + (ramp[i + 1][k] - ramp[i][k]) * f) as [number, number, number];
}
export const rampCss = (a: Analysis) => `linear-gradient(to left, ${RAMPS[a].ramp.map((c) => `rgb(${c.join(',')})`).join(',')})`;

let maskCache: Uint8Array | null = null;
/** 1 בתוך טביעת רגל של בניין */
export function buildingMask(): Uint8Array {
  if (maskCache) return maskCache;
  const c = canvas();
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  for (const b of BUILDINGS) {
    poly(ctx, b.ring);
    ctx.fill();
  }
  const d = ctx.getImageData(0, 0, PW, PH).data;
  maskCache = new Uint8Array(PW * PH);
  for (let i = 0; i < maskCache.length; i++) maskCache[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return maskCache;
}

function paint(values: Float32Array, a: Analysis, alpha = 215) {
  const c = canvas();
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(PW, PH);
  const mask = buildingMask();
  const { ramp } = RAMPS[a];
  for (let i = 0; i < values.length; i++) {
    if (mask[i]) continue; // גגות: שקוף, המסה עצמה מוצגת
    const [r, g, b] = colorAt(ramp, values[i]);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = alpha;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------- רוח
export const WIND_DIRS = [
  { deg: 270, name: 'מערב' },
  { deg: 315, name: 'צפון-מערב' },
  { deg: 0, name: 'צפון' },
  { deg: 45, name: 'צפון-מזרח' },
  { deg: 90, name: 'מזרח' },
  { deg: 135, name: 'דרום-מזרח' },
  { deg: 180, name: 'דרום' },
  { deg: 225, name: 'דרום-מערב' },
];
/** וקטור הכיוון שאליו הרוח נושבת (מזרח, צפון), לפי הכיוון שממנו היא באה */
export const windTo = (fromDeg: number): Pt => [-Math.sin((fromDeg * Math.PI) / 180), -Math.cos((fromDeg * Math.PI) / 180)];

const windCache = new Map<number, Float32Array>();
/** מקדם מהירות יחסי: 0.25 בצל רוח, 0.5 ברוח חופשית, 0.85 באזור האצה. מנורמל ל-0 עד 1 */
export function windField(fromDeg: number): Float32Array {
  const hit = windCache.get(fromDeg);
  if (hit) return hit;
  const c = canvas();
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const [dx, dy] = windTo(fromDeg);
  ctx.fillStyle = 'rgb(128,0,0)';
  ctx.fillRect(0, 0, PW, PH);
  // האצה סביב מגדלים: רצועה של כ-14 מ' סביב טביעת הרגל
  ctx.strokeStyle = 'rgb(215,0,0)';
  ctx.lineJoin = 'round';
  for (const b of BUILDINGS) {
    if (b.h < 40) continue;
    ctx.lineWidth = Math.min(40, 14 + b.h * 0.14) * 2;
    poly(ctx, b.ring);
    ctx.stroke();
  }
  // צל רוח: פי ארבעה מגובה הבניין, עד 220 מ'
  ctx.fillStyle = 'rgb(52,0,0)';
  for (const b of BUILDINGS) {
    const len = Math.min(220, b.h * 4);
    poly(ctx, sweep(b.ring, dx * len, dy * len));
    ctx.fill();
  }
  const d = ctx.getImageData(0, 0, PW, PH).data;
  const out = new Float32Array(PW * PH);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  windCache.set(fromDeg, out);
  return out;
}

// ---------- ניקוז
const cellAt = (i: number, j: number) => DEM.h[j * DEM.nx + i];
/** גובה הקרקע בנקודה, באינטרפולציה */
export function ground(x: number, y: number) {
  const fx = Math.max(0, Math.min(DEM.nx - 1.001, (x - DEM.x0) / DEM.cell));
  const fy = Math.max(0, Math.min(DEM.ny - 1.001, (y - DEM.y0) / DEM.cell));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const a = fx - i;
  const b = fy - j;
  return cellAt(i, j) * (1 - a) * (1 - b) + cellAt(i + 1, j) * a * (1 - b) + cellAt(i, j + 1) * (1 - a) * b + cellAt(i + 1, j + 1) * a * b;
}
/** כיוון הירידה והשיפוע בנקודה */
export function downhill(x: number, y: number): { d: Pt; slope: number } {
  const e = 6;
  const gx = (ground(x + e, y) - ground(x - e, y)) / (2 * e);
  const gy = (ground(x, y + e) - ground(x, y - e)) / (2 * e);
  const s = Math.hypot(gx, gy);
  return { d: s > 1e-5 ? [-gx / s, -gy / s] : [0, 0], slope: s };
}

let flowCache: { acc: Float32Array; sinks: Pt[] } | null = null;
/** הצטברות נגר: כמה תאים מנקזים אל כל תא (שיטת D8), ונקודות היקוות */
export function flow() {
  if (flowCache) return flowCache;
  const { nx, ny } = DEM;
  const n = nx * ny;
  const to = new Int32Array(n).fill(-1);
  const sinks: Pt[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let best = 0;
      let bi = -1;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const a = i + di;
          const b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
          const drop = (cellAt(i, j) - cellAt(a, b)) / Math.hypot(di, dj);
          if (drop > best) {
            best = drop;
            bi = b * nx + a;
          }
        }
      }
      to[j * nx + i] = bi;
    }
  }
  const order = Array.from({ length: n }, (_, k) => k).sort((a, b) => DEM.h[b] - DEM.h[a]);
  const acc = new Float32Array(n).fill(1);
  for (const k of order) if (to[k] >= 0) acc[to[k]] += acc[k];
  // שקע משמעותי: נקודה נמוכה שמנקזת אליה לפחות כ-6 דונם. שקעים קטנים הם רעש של נתוני הגובה
  for (let j = 2; j < ny - 2; j++) {
    for (let i = 2; i < nx - 2; i++) {
      const k = j * nx + i;
      if (to[k] < 0 && acc[k] >= 40) sinks.push([DEM.x0 + i * DEM.cell, DEM.y0 + j * DEM.cell]);
    }
  }
  flowCache = { acc, sinks };
  return flowCache;
}
/** הצטברות הנגר בנקודה, מנורמלת לוגריתמית ל-0 עד 1 */
export function flowAt(x: number, y: number) {
  const { acc } = flow();
  const fx = Math.max(0, Math.min(DEM.nx - 1.001, (x - DEM.x0) / DEM.cell));
  const fy = Math.max(0, Math.min(DEM.ny - 1.001, (y - DEM.y0) / DEM.cell));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const a = fx - i;
  const b = fy - j;
  const v = (ii: number, jj: number) => Math.log(acc[jj * DEM.nx + ii]);
  const l = v(i, j) * (1 - a) * (1 - b) + v(i + 1, j) * a * (1 - b) + v(i, j + 1) * (1 - a) * b + v(i + 1, j + 1) * a * b;
  return Math.min(1, l / Math.log(600));
}
function flowRaster(): Float32Array {
  const out = new Float32Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) out[y * PW + x] = flowAt(X0 + x, Y1 - y);
  return out;
}

// ---------- חום
let surfCache: Float32Array | null = null;
/** מקדם המשטח: אספלט 1, קרקע וריצוף 0.6, שטח מגונן 0.25 */
function surface(): Float32Array {
  if (surfCache) return surfCache;
  const c = canvas();
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = 'rgb(153,0,0)';
  ctx.fillRect(0, 0, PW, PH);
  ctx.fillStyle = 'rgb(64,0,0)';
  for (const l of PUBLIC.lots) {
    if (KIND[l.kind].built) continue;
    poly(ctx, l.ring as Pt[]);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgb(255,0,0)';
  ctx.lineCap = 'round';
  for (const s of CONTEXT.streets) {
    ctx.lineWidth = s.w;
    for (const line of s.l) {
      ctx.beginPath();
      (line as Pt[]).forEach((p, i) => {
        const [x, y] = px(p);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  }
  const d = ctx.getImageData(0, 0, PW, PH).data;
  surfCache = new Float32Array(PW * PH);
  for (let i = 0; i < surfCache.length; i++) surfCache[i] = d[i * 4] / 255;
  return surfCache;
}
const heatCache = new Map<Season, Float32Array>();
export function heatField(season: Season): Float32Array {
  const hit = heatCache.get(season);
  if (hit) return hit;
  const sh = shadeFraction(season, 10, 16);
  const sf = surface();
  const out = new Float32Array(PW * PH);
  for (let i = 0; i < out.length; i++) out[i] = (1 - sh[i]) * sf[i];
  heatCache.set(season, out);
  return out;
}

// ---------- מפה לתצוגה, ונתונים לאורך הרחובות
export interface Params {
  season: Season;
  hour: number;
  windFrom: number;
  day: boolean; // הצללות: כל היום, או השעה הנוכחית
}
export function field(a: Analysis, p: Params): Float32Array {
  if (a === 'shade') return shadeFraction(p.season);
  if (a === 'wind') return windField(p.windFrom);
  if (a === 'heat') return heatField(p.season);
  return flowRaster();
}
export function mapCanvas(a: Analysis, p: Params): HTMLCanvasElement {
  if (a === 'shade' && !p.day) return shadeNow(p.season, p.hour);
  return paint(field(a, p), a);
}
const sample = (f: Float32Array, p: Pt) => {
  const x = Math.round(p[0] - X0);
  const y = Math.round(Y1 - p[1]);
  return x < 0 || y < 0 || x >= PW || y >= PH ? NaN : f[y * PW + x];
};

export interface StreetStat {
  n: string;
  v: number;
}
/** ממוצע של שדה לאורך המדרכות, בסך הכול ולכל רחוב */
export function alongStreets(f: Float32Array, test?: (v: number) => boolean) {
  const by = new Map<string, { s: number; c: number }>();
  let s = 0;
  let c = 0;
  for (const w of WALK) {
    const v = sample(f, w.p);
    if (Number.isNaN(v)) continue;
    const x = test ? (test(v) ? 1 : 0) : v;
    s += x;
    c++;
    const e = by.get(w.n) ?? { s: 0, c: 0 };
    e.s += x;
    e.c++;
    by.set(w.n, e);
  }
  const streets: StreetStat[] = [...by].filter(([, e]) => e.c >= 12).map(([n, e]) => ({ n, v: e.s / e.c }));
  streets.sort((a, b) => b.v - a.v);
  return { all: c ? s / c : 0, streets };
}
export const sinksInPlan = () => {
  const { sinks } = flow();
  const xs = QUARTER.lots.flatMap((l) => l.ring.map((p) => p[0]));
  const ys = QUARTER.lots.flatMap((l) => l.ring.map((p) => p[1]));
  const [a, b, c, d] = [Math.min(...xs) - 60, Math.max(...xs) + 60, Math.min(...ys) - 60, Math.max(...ys) + 60];
  return sinks.filter(([x, y]) => x > a && x < b && y > c && y < d);
};
/** כיוון הירידה הכללי של השטח, כשם של רוח שמיים */
export function mainSlope() {
  let sx = 0;
  let sy = 0;
  for (const w of WALK) {
    const { d, slope } = downhill(w.p[0], w.p[1]);
    sx += d[0] * slope;
    sy += d[1] * slope;
  }
  const deg = ((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360;
  return WIND_DIRS.reduce((best, w) => (Math.abs(((w.deg - deg + 540) % 360) - 180) < Math.abs(((best.deg - deg + 540) % 360) - 180) ? w : best)).name;
}
