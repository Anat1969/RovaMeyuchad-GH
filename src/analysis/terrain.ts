import * as THREE from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { DEM } from '../data/demData';
import { pushRibbon, type Pt } from '../components/viewport/geometry';
import { groundDesign } from './engine';

/**
 * הטופוגרפיה שעליה יושב המודל.
 * המקור: נתוני גובה SRTM (כ-30 מ'), מתוקנים לאורך הרחובות לפי 28 מפלסי שוחות מנספח הניקוז של 3/124/03/3.
 * הגובה במודל הוא המפלס המוחלט פחות REF, בלי הגזמה אנכית.
 */
export const REF = 18;
export const tY = (x: number, y: number) => groundDesign(x, y) - REF;

/** רצועה לאורך קו, מונחת על הקרקע */
export function pushRibbonT(out: number[], pts: Pt[], width: number, lift: number) {
  const from = out.length;
  pushRibbon(out, pts, width, lift);
  for (let i = from; i < out.length; i += 3) out[i + 1] += tY(out[i], -out[i + 2]);
}

/** מוסיף נקודות לקו, כך שאף קטע לא ארוך מ-step מטרים, ולא יחתוך את הקרקע */
export function densify(line: Pt[], step = 20): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  if (line.length) out.push(line[line.length - 1]);
  return out;
}

/** מלבן מסובב שמונח על הקרקע, עם מרקם: תשריט נספח, מפת ניתוח */
export function drapedPlane(cx: number, cy: number, w: number, h: number, angle: number, lift: number, cell = 14) {
  const nx = Math.max(2, Math.ceil(w / cell));
  const ny = Math.max(2, Math.ceil(h / cell));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = (i / nx - 0.5) * w;
      const v = (j / ny - 0.5) * h;
      const x = cx + u * c + v * s;
      const y = cy - u * s + v * c;
      pos.push(x, tY(x, y) + lift, -y);
      uv.push(i / nx, j / ny);
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      idx.push(a, a + 1, a + nx + 2, a, a + nx + 2, a + nx + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** אריח לפי ארבע פינות (צפון-מערב, צפון-מזרח, דרום-מזרח, דרום-מערב), מחולק ומונח על הקרקע */
export function drapedQuad(c: Pt[], lift: number, n = 48) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const [nw, ne, se, sw] = c;
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const t = j / n;
      const top: Pt = [nw[0] + (ne[0] - nw[0]) * s, nw[1] + (ne[1] - nw[1]) * s];
      const bot: Pt = [sw[0] + (se[0] - sw[0]) * s, sw[1] + (se[1] - sw[1]) * s];
      const x = top[0] + (bot[0] - top[0]) * t;
      const y = top[1] + (bot[1] - top[1]) * t;
      pos.push(x, tY(x, y) + lift, -y);
      uv.push(s, 1 - t);
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      idx.push(a, a + n + 1, a + n + 2, a, a + n + 2, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** משטח הקרקע כולו: רשת בצפיפות נתוני הגובה, עם שוליים רחבים שממשיכים את גובה השפה */
export function groundGeometry(lift: number) {
  const axis = (x0: number, n: number) => [x0 - 30000, ...Array.from({ length: Math.ceil(n / 2) + 1 }, (_, i) => Math.min(x0 + (n - 1) * DEM.cell, x0 + i * DEM.cell * 2)), x0 + (n - 1) * DEM.cell + 30000];
  const xs = axis(DEM.x0, DEM.nx);
  const ys = axis(DEM.y0, DEM.ny);
  const pos: number[] = [];
  const idx: number[] = [];
  for (const y of ys) for (const x of xs) pos.push(x, tY(x, y) + lift, -y);
  const w = xs.length;
  for (let j = 0; j + 1 < ys.length; j++) {
    for (let i = 0; i + 1 < w; i++) {
      const a = j * w + i;
      idx.push(a, a + 1, a + w + 1, a, a + w + 1, a + w);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** מצולע שטוח (מגרש פתוח, שצ"פ), מחולק למשולשים קטנים ומונח על הקרקע */
export function drapedShape(ring: Pt[], lift: number) {
  const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
  let g: THREE.BufferGeometry = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g = new TessellateModifier(22, 7).modify(g);
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    p.setY(i, tY(p.getX(i), -p.getZ(i)) + lift);
    uv[i * 2] = p.getX(i) / 4;
    uv[i * 2 + 1] = p.getZ(i) / 4;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** קו פתוח שמונח על הקרקע */
export const drapedLine = (line: Pt[], lift: number): [number, number, number][] => densify(line, 15).map(([x, y]) => [x, tY(x, y) + lift, -y]);
/** קו מתאר שמונח על הקרקע */
export const drapedRing = (ring: Pt[], lift: number): [number, number, number][] => densify([...ring, ring[0]], 15).map(([x, y]) => [x, tY(x, y) + lift, -y]);
