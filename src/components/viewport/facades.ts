import * as THREE from 'three';

/**
 * חזיתות גנריות להדמיה הריאליסטית: מפתח אחד וקומה אחת, שחוזרים על כל הבניין.
 * החיפוי לפי הוראות התכנית: אבן, אלומיניום וזכוכית.
 */
export const BAY = 3.6; // מ', רוחב מפתח
export const FLOOR = 3.3; // מ', גובה קומה

function texture(draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  draw(c.getContext('2d')!, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

function glass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#6F8797');
  g.addColorStop(0.45, '#33424F');
  g.addColorStop(1, '#55697A');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2A2F33';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
}

let cache: { stone: THREE.Texture; mixed: THREE.Texture; shop: THREE.Texture } | null = null;

export function facadeTextures() {
  if (cache) return cache;
  const stone = texture((ctx, s) => {
    ctx.fillStyle = '#E4DACA';
    ctx.fillRect(0, 0, s, s);
    // פסי אבן עדינים
    ctx.fillStyle = 'rgba(120,100,70,0.08)';
    for (let y = 0; y < s; y += 32) ctx.fillRect(0, y, s, 2);
    glass(ctx, 44, 58, 168, 128);
    // מרפסת: לוח ומעקה
    ctx.fillStyle = '#F6F1E8';
    ctx.fillRect(20, 196, 216, 14);
    ctx.fillStyle = 'rgba(40,40,40,0.28)';
    ctx.fillRect(20, 210, 216, 8);
    ctx.fillStyle = 'rgba(190,205,212,0.55)';
    ctx.fillRect(26, 150, 204, 46);
  }, [1 / BAY, 1 / FLOOR]);
  const mixed = texture((ctx, s) => {
    ctx.fillStyle = '#D9CDBB';
    ctx.fillRect(0, 0, s, s);
    glass(ctx, 20, 40, 216, 168);
    ctx.fillStyle = '#EEE7DB';
    ctx.fillRect(0, 216, s, 16);
    ctx.fillStyle = 'rgba(40,40,40,0.3)';
    ctx.fillRect(0, 232, s, 6);
  }, [1 / BAY, 1 / FLOOR]);
  const shop = texture((ctx, s) => {
    ctx.fillStyle = '#4A4744';
    ctx.fillRect(0, 0, s, s);
    glass(ctx, 14, 60, 228, 190);
    ctx.fillStyle = '#B8763A';
    ctx.fillRect(0, 22, s, 26);
  }, [1 / 6, 1 / 6]);
  cache = { stone, mixed, shop };
  return cache;
}
