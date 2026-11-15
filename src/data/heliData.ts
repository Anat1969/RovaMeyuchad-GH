import { QUARTER } from './quarterData';
import { groundExisting } from '../analysis/engine';

/** משפך הגישה של מנחת המסוקים במגרש 307, כפי שנקרא מהנספח של 3/124/03/3.
 * המפלסים המוחלטים רשומים בגיליון: H1=+51.6, H2=+90. מהם נגזר מפלס המנחת, 32.0.
 * הגיאומטריה תואמת את תקן ICAO למנחת מסוקים: 245 מ' ב-8%, 307 מ' ב-12.5%, 613 מ' ב-15%. */
export const HELI = {
  pad: [-179.2, 122.0] as [number, number],
  axis: [0.8467, -0.5321] as [number, number],
  padLevel: 32,
  half: 27, // חצי אורך שטח הביטחון, וגם חצי הרוחב הפנימי של המשפך
  diverge: 0.15, // התרחבות לכל צד
  segs: [
    { len: 245, slope: 0.08 },
    { len: 307, slope: 0.125 },
    { len: 613, slope: 0.15 },
  ],
};
const TOTAL = 1165;
const WIDEN = 552; // עד כאן המשפך מתרחב, ואחר כך ברוחב קבוע של כ-220 מ'

/** המפלס המוחלט המותר במרחק s מקצה שטח הביטחון */
export function allowedLevel(s: number) {
  let lvl = HELI.padLevel;
  let left = s;
  for (const g of HELI.segs) {
    const d = Math.min(left, g.len);
    lvl += d * g.slope;
    left -= d;
    if (left <= 0) break;
  }
  return lvl;
}
export const halfWidth = (s: number) => HELI.half + HELI.diverge * Math.min(s, WIDEN);

/** מרחק לאורך הציר ולרוחבו. s שלילי: בתוך שטח הביטחון */
export function funnelPos(x: number, y: number) {
  const dx = x - HELI.pad[0];
  const dy = y - HELI.pad[1];
  const along = dx * HELI.axis[0] + dy * HELI.axis[1];
  const side = -dx * HELI.axis[1] + dy * HELI.axis[0];
  return { s: Math.abs(along) - HELI.half, t: Math.abs(side), dir: Math.sign(along) || 1 };
}

export interface FunnelHit {
  num: string;
  top: number; // מפלס מוחלט של ראש הבניין לפי הזכויות
  allowed: number; // המפלס המותר בנקודה הקרובה ביותר למנחת
  over: number; // חריגה במטרים. שלילי: מרווח
  share: number; // חלק המגרש שבתוך המשפך
}
/** מגרשי המגורים שמתחת למשפך, והאם מעטפת הזכויות חודרת אותו */
export function funnelHits(): FunnelHit[] {
  const out: FunnelHit[] = [];
  for (const l of QUARTER.lots) {
    let n = 0;
    let minS = Infinity;
    // דגימה של פנים המגרש, ולא רק של הקודקודים
    const xs = l.ring.map((p) => p[0]);
    const ys = l.ring.map((p) => p[1]);
    const cxm = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cym = ys.reduce((a, b) => a + b, 0) / ys.length;
    const pts: [number, number][] = [];
    for (const p of l.ring) for (const k of [1, 0.66, 0.33]) pts.push([cxm + (p[0] - cxm) * k, cym + (p[1] - cym) * k]);
    for (const [x, y] of pts) {
      const { s, t } = funnelPos(x, y);
      if (s > 0 && s <= TOTAL && t <= halfWidth(s)) {
        n++;
        minS = Math.min(minS, s);
      }
    }
    if (!n) continue;
    const top = groundExisting(cxm, cym) + l.height;
    const allowed = allowedLevel(minS);
    out.push({ num: l.num, top, allowed, over: top - allowed, share: n / pts.length });
  }
  return out.sort((a, b) => b.over - a.over);
}
export const FUNNEL_TOTAL = TOTAL;
