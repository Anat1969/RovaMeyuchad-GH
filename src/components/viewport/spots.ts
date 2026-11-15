import { tY } from '../../analysis/terrain';
import { CONTEXT } from '../../data/contextData';

type V3 = [number, number, number];
/** רחובות לדוגמה, לפי סיווג. השיוך של חתך לרחוב הוא לפי סיווג הרחוב, ולא נקרא מנספח התנועה */
const STREETS = {
  road8: { n: 'רפאל איתן (רפול)', name: 'כביש 8, רפאל איתן' },
  avenue: { n: 'שד אלטלנה', name: 'שדרות אלטלנה' },
  local: { n: 'שאול בן שמחון', name: 'שאול בן שמחון' },
};
export type StreetKey = keyof typeof STREETS;
export const streetName = (k: StreetKey) => STREETS[k].name;

/** נקודת מבט על רחוב. eye: בגובה עיני הולך רגל על המדרכה. אחרת: מבט אלכסוני מגובה 28 מ' */
export function streetSpot(k: StreetKey, eye = false): { pos: V3; target: V3 } {
  const run = CONTEXT.planRuns.filter((r) => r.n === STREETS[k].n).sort((a, b) => b.pts.length - a.pts.length)[0];
  const pts = run.pts;
  const i = Math.floor(pts.length * 0.3);
  const j = Math.min(pts.length - 1, i + (eye ? 9 : 5));
  const [ax, ay] = pts[i];
  const [bx, by] = pts[j];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  // ניצב לכיוון הרחוב, אל המדרכה
  const [nx, ny] = [-(by - ay) / len, (bx - ax) / len];
  const side = run.w / 2 + 4.6;
  if (eye) return { pos: [ax + nx * side, tY(ax, ay) + 1.7, -(ay + ny * side)], target: [bx + nx * side * 0.9, tY(bx, by) + 1.5, -(by + ny * side * 0.9)] };
  return { pos: [ax + nx * 26 - ((bx - ax) / len) * 34, tY(ax, ay) + 28, -(ay + ny * 26 - ((by - ay) / len) * 34)], target: [bx, tY(bx, by), -by] };
}
