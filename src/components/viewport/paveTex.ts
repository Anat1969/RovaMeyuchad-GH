import * as THREE from 'three';

/** דוגמת הנחה של אבני הריצוף, כמרקם בהיר שצבע החלופה מוכפל בו. 256 פיקסלים הם 4 מ' */
export type PaveKind = 'slab' | 'linear' | 'square' | 'poly' | 'natural' | 'mosaic';
/** איזו דוגמה שייכת לכל חלופה. המקור: מצגת שפת רחוב ושצ"פ, עמ' 9 עד 11 ו-16 עד 18 */
export const PAVE_OF: Record<string, PaveKind> = { 'street-1': 'slab', 'street-2': 'linear', 'street-3': 'square', 'path-1': 'poly', 'path-2': 'natural', 'path-3': 'mosaic' };

const cache = new Map<PaveKind, THREE.Texture>();
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export function paveTexture(kind: PaveKind): THREE.Texture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, S, S);
  const stone = (x: number, y: number, w: number, h: number, i: number) => {
    const v = Math.round(215 + rnd(i) * 40);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x + 1, y + 1, w - 2, h - 2);
  };
  const grid = (w: number, h: number, bond: boolean) => {
    let i = 0;
    for (let y = 0, r = 0; y < S; y += h, r++) for (let x = bond && r % 2 ? -w / 2 : 0; x < S; x += w) stone(x, y, w, h, i++);
  };
  if (kind === 'slab') grid(64, 32, true);
  else if (kind === 'linear') grid(128, 16, true);
  else if (kind === 'square') grid(32, 32, false);
  else if (kind === 'mosaic') grid(8, 8, false);
  else {
    // אבן פוליגונלית או טבעית: תאי וורונוי, שחוזרים בלי תפר
    const n = kind === 'poly' ? 26 : 60;
    const pts = Array.from({ length: n }, (_, i) => [rnd(i * 2 + 1) * S, rnd(i * 2 + 2) * S]);
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let a = 1e9;
        let b = 1e9;
        let k = 0;
        pts.forEach(([px, py], i) => {
          const dx = Math.min(Math.abs(px - x), S - Math.abs(px - x));
          const dy = Math.min(Math.abs(py - y), S - Math.abs(py - y));
          const d = Math.hypot(dx, dy);
          if (d < a) {
            b = a;
            a = d;
            k = i;
          } else if (d < b) b = d;
        });
        const v = b - a < 2.2 ? 138 : 215 + rnd(k) * 40;
        img.data.set([v, v, v, 255], (y * S + x) * 4);
      }
    }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(kind, t);
  return t;
}
