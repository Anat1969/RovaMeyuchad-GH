import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { PUBLIC } from '../../data/publicData';
import { KIND } from '../../data/publicKinds';
import { DESIGNS } from '../../data/designData';
import type { PublicLot } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import { facadeTextures } from './facades';

type Ring = [number, number][];

function centroid(ring: Ring): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const f = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    a += f;
    cx += (ring[i][0] + ring[i + 1][0]) * f;
    cy += (ring[i][1] + ring[i + 1][1]) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
const shrink = (ring: Ring, c: [number, number], pct: number): Ring => {
  const k = Math.sqrt(pct / 100);
  return ring.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
};
const flat = (ring: Ring, y: number): [number, number, number][] => ring.map(([x, n]) => [x, y, -n]);

function useGeo(ring: Ring, height: number) {
  return useMemo(() => {
    const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = height > 0 ? new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }) : new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [ring, height]);
}

function Slab({ ring, y, color, opacity, onClick }: { ring: Ring; y: number; color: string; opacity: number; onClick?: () => void }) {
  const geo = useGeo(ring, 0);
  return (
    <mesh
      geometry={geo}
      position={[0, y, 0]}
      receiveShadow
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} roughness={1} />
    </mesh>
  );
}

function Mass({
  ring,
  base,
  height,
  color,
  opacity,
  real,
  onClick,
}: {
  ring: Ring;
  base: number;
  height: number;
  color: string;
  opacity: number;
  real: boolean;
  onClick: () => void;
}) {
  const geo = useGeo(ring, height);
  const events = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onClick();
    },
    onPointerOver: () => (document.body.style.cursor = 'pointer'),
    onPointerOut: () => (document.body.style.cursor = ''),
  };
  if (real) {
    return (
      <mesh key="real" geometry={geo} position={[0, base, 0]} castShadow receiveShadow {...events}>
        <meshStandardMaterial attach="material-0" color="#CFC8BC" roughness={0.95} />
        <meshStandardMaterial attach="material-1" map={facadeTextures().mixed} roughness={0.55} metalness={0.08} />
      </mesh>
    );
  }
  return (
    <mesh key="model" geometry={geo} position={[0, base, 0]} {...events}>
      <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={opacity > 0.85} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Lot({ lot }: { lot: PublicLot }) {
  const real = usePlanStore((s) => s.renderMode) === 'real';
  const massMode = usePlanStore((s) => s.massMode);
  const topicId = usePlanStore((s) => s.selectedTopicId);
  const selectedLot = usePlanStore((s) => s.selectedLot);
  const focus = usePlanStore((s) => s.legendFocus);
  const selectLot = usePlanStore((s) => s.selectLot);
  const meta = KIND[lot.kind];
  const c = useMemo(() => centroid(lot.ring as Ring), [lot]);
  const envelope = useMemo(() => shrink(lot.ring as Ring, c, lot.coverage ?? 50), [lot, c]);
  const design = DESIGNS.find((d) => d.lot === lot.num);

  const isSel = selectedLot === lot.num;
  const active = topicId === 'public';
  // בנושאי הפיתוח ובנושא הבינוי, מגרשי הציבור נסוגים לרקע
  const back = topicId !== null && !active;
  const kinds = Object.keys(KIND);
  let fade = back ? 0.18 : 1;
  if (active && selectedLot) fade = isSel ? 1 : 0.25;
  else if (active && focus) fade = kinds.indexOf(lot.kind) === focus.idx ? 1 : 0.15;
  const pick = () => selectLot(isSel ? null : lot.num);

  if (!meta.built) {
    return (
      <group>
        <Slab ring={lot.ring as Ring} y={0.12} color={meta.color} opacity={real ? 0.45 : 0.85 * fade} onClick={pick} />
        {isSel && <Line points={flat(lot.ring as Ring, 0.4)} color="#2E2E2B" lineWidth={3} />}
      </group>
    );
  }

  return (
    <group>
      {!real && <Slab ring={lot.ring as Ring} y={0.1} color={meta.color} opacity={0.3 * fade + 0.08} onClick={pick} />}
      {!real && <Line points={flat(lot.ring as Ring, 0.25)} color={isSel ? '#2E2E2B' : meta.color} lineWidth={isSel ? 3 : 1.5} />}
      {massMode === 'rights' ? (
        // מעטפת הזכויות: המגרש מוקטן לאחוז התכסית, ומוגבה לגובה המרבי
        <Mass ring={envelope} base={0.15} height={lot.height ?? 6} color={meta.color} opacity={0.82 * fade} real={real} onClick={pick} />
      ) : design ? (
        design.masses.map((m, i) => (
          <Mass key={i} ring={m.ring as Ring} base={m.base} height={m.height} color={meta.color} opacity={fade} real={real} onClick={pick} />
        ))
      ) : (
        // אין עדיין מודל תכנון: רק קו המעטפת המותרת, מקווקו
        <Line points={flat(envelope, (lot.height ?? 6) + 0.2)} color={meta.color} lineWidth={1} dashed dashSize={4} gapSize={3} />
      )}
      {!real && !back && (
        <Html position={[c[0], (massMode === 'rights' ? (lot.height ?? 6) : 0) + 7, -c[1]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span
            className={`whitespace-nowrap px-1 text-[0.7rem] ${isSel ? 'bg-ink font-semibold text-white' : 'text-white'}`}
            style={isSel ? undefined : { background: meta.color }}
          >
            {lot.num}
          </span>
        </Html>
      )}
    </group>
  );
}

/** מגרשי הציבור, החינוך, המעונות, המסחר והשטחים הפתוחים של תכנית 3/124/03/3 */
export default function PublicLots() {
  const real = usePlanStore((s) => s.renderMode) === 'real';
  const context = usePlanStore((s) => s.contextMode);
  return (
    <group>
      {/* דרכים ושבילים מהשרטוט: רק על רקע נקי, כי בסכמה ובלוויין הרחובות כבר מוצגים */}
      {!real && context === 'none' && PUBLIC.roads.map((r, i) => <Slab key={i} ring={r as Ring} y={0.05} color="#E4DCCF" opacity={0.9} />)}
      {PUBLIC.lots.map((l) => (
        <Lot key={l.num} lot={l} />
      ))}
    </group>
  );
}
