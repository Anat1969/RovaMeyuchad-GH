import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONTEXT } from '../../data/contextData';
import { usePlanStore } from '../../store/planStore';
import { ribbonGeometry, type Pt } from './geometry';
import { densify, drapedQuad, groundGeometry, pushRibbonT, tY } from '../../analysis/terrain';

const TILE_URL = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
// שכבות רזולוציה: העיר כולה, סביבת הרובע, והתוכנית עצמה. החדה מעל הגסה
const TILE_Y: Record<number, number> = { 14: -1.2, 16: -0.8, 18: -0.4 };

function Tile({ z, x, y, c, lit }: { z: number; x: number; y: number; c: Pt[]; lit: boolean }) {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const geo = useMemo(() => {
    // הפינות: צפון-מערב, צפון-מזרח, דרום-מזרח, דרום-מערב. האריח מחולק ומונח על הקרקע
    return drapedQuad(c, TILE_Y[z] ?? -1, z >= 18 ? 40 : 64);
  }, [z, c]);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(TILE_URL(z, x, y), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      if (alive) setMap(t);
      else t.dispose();
    });
    return () => {
      alive = false;
    };
  }, [z, x, y]);
  useEffect(() => () => map?.dispose(), [map]);

  if (!map) return null;
  return (
    <mesh geometry={geo} receiveShadow={lit}>
      {/* במצב ריאליסטי האריח מקבל אור וצל מהבניינים */}
      {lit ? <meshStandardMaterial map={map} roughness={1} metalness={0} /> : <meshBasicMaterial map={map} toneMapped={false} />}
    </mesh>
  );
}

/** רחובות העיר כרצועות, ברוחב סכמטי לפי סיווג הדרך */
function Streets({ satellite }: { satellite: boolean }) {
  const [main, minor] = useMemo(() => {
    const a: number[] = [];
    const b: number[] = [];
    for (const s of CONTEXT.streets) for (const line of s.l) pushRibbonT(s.w >= 14 ? a : b, densify(line as Pt[]), s.w, s.w >= 14 ? 0.06 : 0.04);
    return [ribbonGeometry(a), ribbonGeometry(b)];
  }, []);
  return (
    <group>
      <mesh geometry={minor}>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={satellite ? 0.28 : 1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh geometry={main}>
        <meshBasicMaterial color={satellite ? '#FFFFFF' : '#FBF7EF'} transparent opacity={satellite ? 0.4 : 1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

const dist2 = (p: Pt) => p[0] * p[0] + p[1] * p[1];

/** שם רחוב כמרקם: הדפדפן מצייר את העברית, ולכן אין צורך בקובץ גופן */
function labelTexture(text: string, light: boolean) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const font = '600 44px Heebo, system-ui, sans-serif';
  ctx.font = font;
  c.width = Math.ceil(ctx.measureText(text).width) + 28;
  c.height = 64;
  ctx.font = font;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = light ? 'rgba(20,20,18,0.85)' : 'rgba(255,255,255,0.95)';
  ctx.strokeText(text, c.width / 2, 34);
  ctx.fillStyle = light ? '#FFFFFF' : '#3A3A36';
  ctx.fillText(text, c.width / 2, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { t, ratio: c.width / c.height };
}

interface StreetLabel {
  n: string;
  p: Pt;
  angle: number;
  major: boolean;
}

/** נקודה ושיפוע לכל רחוב סמוך: באמצע הקטע הארוך ביותר שבטווח, בלי התנגשות עם שם אחר */
function pickLabels(): StreetLabel[] {
  const out: StreetLabel[] = [];
  const seen = new Set<string>();
  const byWidth = [...CONTEXT.streets].sort((a, b) => b.w - a.w);
  for (const s of byWidth) {
    if (seen.has(s.n)) continue;
    let best: { p: Pt; angle: number; len: number } | null = null;
    for (const line of s.l) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i] as Pt;
        const b = line[i + 1] as Pt;
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (dist2(mid) > 1000 * 1000 || len < 30) continue;
        // קטע ארוך וקרוב לתוכנית עדיף
        const score = len - Math.sqrt(dist2(mid)) * 0.15;
        if (!best || score > best.len) {
          let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
          if (angle > Math.PI / 2) angle -= Math.PI;
          if (angle <= -Math.PI / 2) angle += Math.PI;
          best = { p: mid, angle, len: score };
        }
      }
    }
    if (!best) continue;
    const major = s.w >= 14;
    const gap = major ? 90 : 55;
    if (out.some((o) => Math.hypot(o.p[0] - best!.p[0], o.p[1] - best!.p[1]) < gap)) continue;
    seen.add(s.n);
    out.push({ n: s.n, p: best.p, angle: best.angle, major });
  }
  return out;
}

/**
 * שמות הרחובות מונחים על הקרקע, לאורך הרחוב, כמו במפה.
 * כך בניין שעומד לפניהם מסתיר אותם, והם לא צפים מעל התלת-ממד.
 */
function StreetNames({ satellite }: { satellite: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setReady(true);
    if (document.fonts?.load) document.fonts.load('600 44px Heebo').then(done, done);
    else done();
    return () => {
      alive = false;
    };
  }, []);
  const labels = useMemo(pickLabels, []);
  // גודל הכיתוב לפי המרחק: במבט רחוק רק הרחובות הראשיים, ובגדול
  const camera = useThree((s) => s.camera);
  const [band, setBand] = useState<'near' | 'mid' | 'far'>('mid');
  const last = useRef(band);
  useFrame(() => {
    const d = camera.position.length();
    const b = d < 750 ? 'near' : d < 2600 ? 'mid' : 'far';
    if (b !== last.current) {
      last.current = b;
      setBand(b);
    }
  });
  const items = useMemo(
    () => (ready ? labels.map((l) => ({ ...l, ...labelTexture(l.n, satellite) })) : []),
    [ready, labels, satellite],
  );
  useEffect(() => () => items.forEach((i) => i.t.dispose()), [items]);

  return (
    <group>
      {items.map((l) => {
        if (band === 'far' || (band === 'mid' && !l.major)) return null;
        const h = band === 'mid' ? 44 : l.major ? 13 : 8;
        return (
          <group key={l.n} position={[l.p[0], 0.9 + tY(l.p[0], l.p[1]), -l.p[1]]} rotation={[0, l.angle, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
              <planeGeometry args={[h * l.ratio, h]} />
              <meshBasicMaterial map={l.t} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** שמות הרובעים, במבט רחוק בלבד */
function QuarterNames({ satellite }: { satellite: boolean }) {
  const camera = useThree((s) => s.camera);
  const [far, setFar] = useState(false);
  const last = useRef(far);
  useFrame(() => {
    const f = camera.position.length() > 2600;
    if (f !== last.current) {
      last.current = f;
      setFar(f);
    }
  });
  if (!far) return null;
  const chip = satellite ? 'bg-black/55 text-white' : 'bg-white/75 text-ink/70';
  return (
    <group>
      <Html position={[0, 3, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap bg-[#D98A3D] px-1.5 py-0.5 text-xs font-semibold text-white">הרובע המיוחד</span>
      </Html>
      {CONTEXT.quarters.map((q) => (
        <Html key={q.id} position={[q.c[0], 2 + tY(q.c[0], q.c[1]), -q.c[1]]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
          <span className={`whitespace-nowrap px-1.5 py-0.5 text-xs font-semibold ${chip}`}>{q.name}</span>
        </Html>
      ))}
    </group>
  );
}

/** פני הקרקע: הטופוגרפיה, מתחת לכל שאר השכבות */
const GROUND = groundGeometry(-2);

export default function ContextLayer() {
  const chosen = usePlanStore((s) => s.contextMode);
  const real = usePlanStore((s) => s.renderMode) === 'real';
  // ההדמיה הריאליסטית יושבת תמיד על תצלום האוויר
  const mode = real ? 'satellite' : chosen;
  if (mode === 'none') {
    return (
      <mesh geometry={GROUND}>
        <meshBasicMaterial color="#F5F0EB" />
      </mesh>
    );
  }
  const satellite = mode === 'satellite';
  return (
    <group>
      <mesh geometry={GROUND}>
        <meshBasicMaterial color={satellite ? '#C9BFAE' : '#EAE4DA'} />
      </mesh>
      {satellite && CONTEXT.tiles.map((t) => <Tile key={`${t.z}/${t.x}/${t.y}`} {...t} lit={real} />)}
      {!real && <Streets satellite={satellite} />}
      {!real && <StreetNames satellite={satellite} />}
      {!real && <QuarterNames satellite={satellite} />}
    </group>
  );
}
