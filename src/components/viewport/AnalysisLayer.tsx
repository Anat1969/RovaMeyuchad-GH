import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlanStore } from '../../store/planStore';
import { H, W, X0, Y1, buildingMask, downhill, flowAt, ground, mapCanvas, windField, windTo } from '../../analysis/engine';

const PW = Math.round(W);
const PH = Math.round(H);

/** מפת הניתוח, פרושה על הקרקע */
function MapPlane() {
  const a = usePlanStore((s) => s.analysis)!;
  const p = usePlanStore((s) => s.analysisParams);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(mapCanvas(a, p));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // במפת יום מלא השעה אינה משנה את התמונה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, p.season, p.windFrom, p.day, a === 'shade' && !p.day ? p.hour : 0]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[X0 + W / 2, 0.9, -(Y1 - H / 2)]} renderOrder={3}>
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial map={tex} transparent opacity={a === 'shade' && !p.day ? 1 : 0.86} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

const N = 1400;
/** חלקיקים בתנועה: רוח שנושבת סביב הבניינים, או נגר שיורד במורד הקרקע */
function Particles({ kind }: { kind: 'wind' | 'water' }) {
  const windFrom = usePlanStore((s) => s.analysisParams.windFrom);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    return g;
  }, []);
  const state = useRef({ x: new Float32Array(N), y: new Float32Array(N), life: new Float32Array(N) });
  const spawn = (i: number) => {
    const s = state.current;
    s.x[i] = X0 + Math.random() * W;
    s.y[i] = Y1 - Math.random() * H;
    s.life[i] = 2 + Math.random() * (kind === 'wind' ? 5 : 9);
  };
  useEffect(() => {
    for (let i = 0; i < N; i++) spawn(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, windFrom]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const s = state.current;
    const pos = geo.attributes.position.array as Float32Array;
    const mask = buildingMask();
    const field = kind === 'wind' ? windField(windFrom) : null;
    const [wx, wy] = windTo(windFrom);
    for (let i = 0; i < N; i++) {
      let vx = 0;
      let vy = 0;
      const ix = Math.round(s.x[i] - X0);
      const iy = Math.round(Y1 - s.y[i]);
      const inside = ix >= 0 && iy >= 0 && ix < PW && iy < PH;
      if (kind === 'wind') {
        const f = inside && field ? field[iy * PW + ix] : 0.5;
        // 0.5 היא רוח חופשית. בצל רוח החלקיק כמעט עומד, ובאזור האצה הוא רץ
        const speed = 95 * f * f * 2.2;
        vx = wx * speed;
        vy = wy * speed;
      } else {
        const { d, slope } = downhill(s.x[i], s.y[i]);
        const speed = Math.min(60, 10 + slope * 900) * (0.5 + flowAt(s.x[i], s.y[i]));
        vx = d[0] * speed;
        vy = d[1] * speed;
      }
      const nx = s.x[i] + vx * dt;
      const ny = s.y[i] + vy * dt;
      const jx = Math.round(nx - X0);
      const jy = Math.round(Y1 - ny);
      const blocked = jx < 0 || jy < 0 || jx >= PW || jy >= PH || (kind === 'wind' && mask[jy * PW + jx] === 1);
      s.life[i] -= dt;
      if (blocked || s.life[i] <= 0 || (kind === 'water' && Math.hypot(vx, vy) < 11)) {
        spawn(i);
        pos.fill(0, i * 6, i * 6 + 6);
        continue;
      }
      s.x[i] = nx;
      s.y[i] = ny;
      const h = kind === 'wind' ? 4 : 1.6;
      const tail = kind === 'wind' ? 0.22 : 0.5;
      pos[i * 6] = nx;
      pos[i * 6 + 1] = h;
      pos[i * 6 + 2] = -ny;
      pos[i * 6 + 3] = nx - vx * tail;
      pos[i * 6 + 4] = h;
      pos[i * 6 + 5] = -(ny - vy * tail);
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geo} frustumCulled={false} renderOrder={4}>
      <lineBasicMaterial color={kind === 'wind' ? '#1E2A44' : '#0B3C8C'} transparent opacity={0.75} depthWrite={false} />
    </lineSegments>
  );
}

/** קווי גובה של פני הקרקע, כדי להבין לאן הנגר יורד */
function Contours() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const step = 12;
    for (let y = Y1 - H; y < Y1; y += step) {
      for (let x = X0; x < X0 + W; x += step) {
        const a = ground(x, y);
        const b = ground(x + step, y);
        const c = ground(x, y + step);
        for (let lvl = 18; lvl <= 52; lvl += 2) {
          const e1 = (a - lvl) * (b - lvl) < 0 ? [x + (step * (lvl - a)) / (b - a), y] : null;
          const e2 = (a - lvl) * (c - lvl) < 0 ? [x, y + (step * (lvl - a)) / (c - a)] : null;
          const e3 = (b - lvl) * (c - lvl) < 0 ? [x + step - (step * (lvl - b)) / (c - b), y + (step * (lvl - b)) / (c - b)] : null;
          const e = [e1, e2, e3].filter(Boolean) as number[][];
          if (e.length === 2) pts.push(e[0][0], 1.2, -e[0][1], e[1][0], 1.2, -e[1][1]);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo} renderOrder={4}>
      <lineBasicMaterial color="#5B4A2E" transparent opacity={0.35} depthWrite={false} />
    </lineSegments>
  );
}

export default function AnalysisLayer() {
  const a = usePlanStore((s) => s.analysis);
  if (!a) return null;
  return (
    <group>
      <MapPlane />
      {a === 'wind' && <Particles kind="wind" />}
      {a === 'water' && <Particles kind="water" />}
      {a === 'water' && <Contours />}
    </group>
  );
}
