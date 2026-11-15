import * as THREE from 'three';

export type Pt = [number, number]; // מטרים: x מזרח, y צפון. במודל: X = x, Z = -y

/** מזיז קו לצד (שמאלה כשהמרחק חיובי), לפי הנורמל הממוצע בכל נקודה */
export function offsetLine(pts: Pt[], d: number): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / len) * d, p[1] + ((b[0] - a[0]) / len) * d];
  });
}

/** כיוון הקו בכל נקודה, ברדיאנים, לסיבוב סביב ציר Y במודל */
export function headings(pts: Pt[]): number[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  });
}

/** מוסיף למערך רצועה שטוחה ברוחב נתון לאורך הקו */
export function pushRibbon(out: number[], pts: Pt[], width: number, y: number) {
  const l = offsetLine(pts, width / 2);
  const r = offsetLine(pts, -width / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = l[i];
    const b = r[i];
    const c = r[i + 1];
    const d = l[i + 1];
    out.push(a[0], y, -a[1], b[0], y, -b[1], c[0], y, -c[1], a[0], y, -a[1], c[0], y, -c[1], d[0], y, -d[1]);
  }
}

export function ribbonGeometry(positions: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
