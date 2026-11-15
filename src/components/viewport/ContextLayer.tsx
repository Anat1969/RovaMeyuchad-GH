import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONTEXT } from '../../data/contextData';
import { usePlanStore } from '../../store/planStore';
import { pushRibbon, ribbonGeometry, type Pt } from './geometry';

const TILE_URL = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
// שכבות רזולוציה: העיר כולה, סביבת הרובע, והתוכנית עצמה. החדה מעל הגסה
const TILE_Y: Record<number, number> = { 14: -1.2, 16: -0.8, 18: -0.4 };

function Tile({ z, x, y, c }: { z: number; x: number; y: number; c: Pt[] }) {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const h = TILE_Y[z] ?? -1;
    // הפינות: צפון-מערב, צפון-מזרח, דרום-מזרח, דרום-מערב
    g.setAttribute('position', new THREE.Float32BufferAttribute(c.flatMap(([px, py]) => [px, h, -py]), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    g.setIndex([0, 3, 2, 0, 2, 1]);
    return g;
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
    <mesh geometry={geo}>
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/** רחובות העיר כרצועות, ברוחב סכמטי לפי סיווג הדרך */
function Streets({ satellite }: { satellite: boolean }) {
  const [main, minor] = useMemo(() => {
    const a: number[] = [];
    const b: number[] = [];
    for (const s of CONTEXT.streets) for (const line of s.l) pushRibbon(s.w >= 14 ? a : b, line, s.w, s.w >= 14 ? 0.06 : 0.04);
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

/** שמות הרובעים במבט רחוק, ושמות הרחובות הסמוכים לתוכנית במבט קרוב */
function Labels({ satellite }: { satellite: boolean }) {
  const camera = useThree((s) => s.camera);
  const [band, setBand] = useState<'near' | 'mid' | 'far'>('mid');
  const last = useRef(band);
  useFrame(() => {
    const d = camera.position.length();
    const b = d < 800 ? 'near' : d < 5200 ? 'mid' : 'far';
    if (b !== last.current) {
      last.current = b;
      setBand(b);
    }
  });

  const streets = useMemo(() => {
    const seen = new Set<string>();
    const out: { n: string; p: Pt; major: boolean }[] = [];
    for (const s of CONTEXT.streets) {
      let best: Pt | null = null;
      for (const line of s.l) for (const p of line) if (!best || dist2(p) < dist2(best)) best = p;
      if (!best || dist2(best) > 950 * 950 || seen.has(s.n)) continue;
      seen.add(s.n);
      out.push({ n: s.n, p: best, major: s.w >= 14 });
    }
    return out;
  }, []);

  const chip = satellite ? 'bg-black/55 text-white' : 'bg-white/75 text-ink/70';
  return (
    <group>
      {band === 'far' && (
        <Html position={[0, 3, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap bg-[#D98A3D] px-1.5 py-0.5 text-xs font-semibold text-white">הרובע המיוחד</span>
        </Html>
      )}
      {band !== 'near' &&
        CONTEXT.quarters.map((q) => (
          <Html key={q.id} position={[q.c[0], 2, -q.c[1]]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
            <span className={`whitespace-nowrap px-1.5 py-0.5 text-xs font-semibold ${chip}`}>{q.name}</span>
          </Html>
        ))}
      {band !== 'far' &&
        streets
          .filter((s) => s.major || band === 'near')
          .map((s) => (
            <Html key={s.n} position={[s.p[0], 1, -s.p[1]]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
              <span className={`whitespace-nowrap px-1 text-[0.65rem] ${chip}`}>{s.n}</span>
            </Html>
          ))}
    </group>
  );
}

export default function ContextLayer() {
  const mode = usePlanStore((s) => s.contextMode);
  if (mode === 'none') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[60000, 60000]} />
        <meshBasicMaterial color="#F5F0EB" />
      </mesh>
    );
  }
  const satellite = mode === 'satellite';
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[60000, 60000]} />
        <meshBasicMaterial color={satellite ? '#C9BFAE' : '#EAE4DA'} />
      </mesh>
      {satellite && CONTEXT.tiles.map((t) => <Tile key={`${t.z}/${t.x}/${t.y}`} {...t} />)}
      <Streets satellite={satellite} />
      <Labels satellite={satellite} />
    </group>
  );
}
