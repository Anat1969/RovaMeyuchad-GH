import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { QUARTER } from '../../data/quarterData';
import type { QuarterLot } from '../../types/plan';
import { drapedLine, drapedShape, tY } from '../../analysis/terrain';
import { usePlanStore } from '../../store/planStore';
import { FLOOR, facadeTextures } from './facades';
import { DESIGNS } from '../../data/designData';

type Ring = [number, number][];

const PODIUM_H = 6; // גובה קומת המסחר, עד 6 מ' (הוראות טבלה 5)
const TOWER_COVERAGE = 35; // הנחה: תכסית המגדל במגרש מעורב כמו במגרש מגורים
const SETBACK_H = FLOOR * 2; // שתי הקומות העליונות בנסיגה (הוראות, סעיף 4.1.2)

function centroid(ring: Ring): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}

/** מקטין את המגרש סביב מרכזו, כך שהשטח שווה לאחוז התכסית */
function footprint(ring: Ring, c: [number, number], coveragePct: number): Ring {
  const k = Math.sqrt(coveragePct / 100);
  return ring.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
}

function shapeOf(ring: Ring) {
  return new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
}

/** משטח או מסה. הצורה ב-x,y (מזרח, צפון) מסובבת כך שהצפון פונה אל ‎-Z והגובה אל Y */
function Solid({
  ring,
  base,
  height,
  color,
  opacity,
  facade,
  onClick,
}: {
  ring: Ring;
  base: number;
  height: number;
  color: string;
  opacity: number;
  facade?: THREE.Texture; // בהדמיה הריאליסטית: מרקם חזית על הקירות
  onClick?: () => void;
}) {
  const geo = useMemo(() => {
    const g =
      height > 0
        ? new THREE.ExtrudeGeometry(shapeOf(ring), { depth: height, bevelEnabled: false })
        : new THREE.ShapeGeometry(shapeOf(ring));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [ring, height]);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Color(), []);
  target.set(color);

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const k = Math.min(1, dt * 7);
    m.color.lerp(target, k);
    m.opacity += (opacity - m.opacity) * k;
    m.depthWrite = m.opacity > 0.85;
  });

  const events = {
    onClick: onClick
      ? (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onClick();
        }
      : undefined,
    onPointerOver: onClick ? () => (document.body.style.cursor = 'pointer') : undefined,
    onPointerOut: onClick ? () => (document.body.style.cursor = '') : undefined,
  };

  if (facade) {
    // קבוצה 0 בגיאומטריה היא הגג, קבוצה 1 היא הקירות
    return (
      <mesh key="real" geometry={geo} position={[0, base, 0]} castShadow receiveShadow {...events}>
        <meshStandardMaterial attach="material-0" color="#CFC8BC" roughness={0.95} />
        <meshStandardMaterial attach="material-1" map={facade} roughness={0.55} metalness={0.08} />
      </mesh>
    );
  }
  return (
    <mesh key="model" geometry={geo} position={[0, base, 0]} {...events}>
      <meshStandardMaterial ref={mat} transparent roughness={0.9} color={color} opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

const flat = (ring: Ring, y: number): [number, number, number][] => ring.map(([x, n]) => [x, y, -n]);

function Lot({ lot, real }: { lot: QuarterLot; real: boolean }) {
  const topics = usePlanStore((s) => s.topics);
  const selectedLot = usePlanStore((s) => s.selectedLot);
  const focus = usePlanStore((s) => s.legendFocus);
  const selectLot = usePlanStore((s) => s.selectLot);
  const topicId = usePlanStore((s) => s.selectedTopicId);
  // בנושא פיתוח המסות נסוגות לרקע, כדי שהרחוב ייראה
  const sheetOn = usePlanStore((s) => s.appendix) !== null;
  const back = sheetOn || (topicId !== null && topicId !== 'massing');
  const massMode = usePlanStore((s) => s.massMode);
  const design = DESIGNS.find((d) => d.lot === lot.num);

  // הצבעים נלקחים מהמקרא של נושא הבינוי, כמו בכל שאר המודל
  const legend = topics.find((t) => t.id === 'massing')?.items[0]?.legend ?? [];
  const cRes = legend[0]?.color ?? '#E9B77E';
  const cMixed = legend[1]?.color ?? '#D98A3D';
  const cPodium = legend[2]?.color ?? '#8E8A93';

  const c = useMemo(() => centroid(lot.ring), [lot]);
  // המגרש יושב על מפלס הקרקע שבמרכזו
  const ty = useMemo(() => tY(c[0], c[1]), [c]);
  const tower = useMemo(() => footprint(lot.ring, c, lot.mixed ? TOWER_COVERAGE : lot.coverage), [lot, c]);
  const crown = useMemo(() => footprint(tower, c, 74), [tower, c]);
  const podium = useMemo(() => (lot.mixed ? footprint(lot.ring, c, lot.coverage) : null), [lot, c]);

  const isSel = selectedLot === lot.num;
  const pick = () => selectLot(isSel ? null : lot.num);
  const towerBase = podium ? PODIUM_H + 0.1 : 0.1;
  const towerH = lot.height - (podium ? PODIUM_H : 0);

  // מודל התכנון: המסות של האדריכל אם הועלו, ואם לא, רק קו המעטפת המותרת
  if (massMode === 'design') {
    return (
      <group position={[0, ty, 0]}>
        {!real && <Solid ring={lot.ring} base={0.05} height={0} color={lot.mixed ? cMixed : cRes} opacity={0.3} onClick={pick} />}
        {!real && <Line points={flat(lot.ring, 0.2)} color={isSel ? '#2E2E2B' : '#B9895A'} lineWidth={isSel ? 3 : 1} />}
        {design ? (
          design.masses.map((m, i) => (
            <Solid key={i} ring={m.ring} base={m.base} height={m.height} color={cMixed} opacity={1} facade={real ? facadeTextures().stone : undefined} onClick={pick} />
          ))
        ) : (
          <Line points={flat(tower, lot.height)} color="#B9895A" lineWidth={1} dashed dashSize={4} gapSize={3} />
        )}
      </group>
    );
  }

  if (real) {
    const tex = facadeTextures();
    const skin = lot.mixed ? tex.mixed : tex.stone;
    return (
      <group position={[0, ty, 0]}>
        {podium && <Solid ring={podium} base={0.1} height={PODIUM_H} color="#fff" opacity={1} facade={tex.shop} onClick={pick} />}
        <Solid ring={tower} base={towerBase} height={towerH - SETBACK_H} color="#fff" opacity={1} facade={skin} onClick={pick} />
        <Solid ring={crown} base={towerBase + towerH - SETBACK_H} height={SETBACK_H} color="#fff" opacity={1} facade={skin} onClick={pick} />
      </group>
    );
  }

  const fade = (idx: number) => {
    if (back) return 0.16;
    if (selectedLot) return isSel ? 1 : 0.22;
    if (focus) return focus.idx === idx ? 1 : 0.12;
    return 1;
  };
  const useIdx = lot.mixed ? 1 : 0;

  return (
    <group position={[0, ty, 0]}>
      {!sheetOn && <Solid ring={lot.ring} base={0.05} height={0} color={lot.mixed ? cMixed : cRes} opacity={0.35 * fade(useIdx) + 0.1} onClick={pick} />}
      <Line points={flat(lot.ring, 0.2)} color={isSel ? '#2E2E2B' : '#B9895A'} lineWidth={isSel ? 3 : 1} />
      {podium && <Solid ring={podium} base={0.1} height={PODIUM_H} color={cPodium} opacity={fade(2)} onClick={pick} />}
      <Solid ring={tower} base={towerBase} height={towerH} color={lot.mixed ? cMixed : cRes} opacity={fade(useIdx)} onClick={pick} />
      {/* מספר המגרש: רק במבט הכולל ובנושא הבינוי, כדי לא להעמיס על נושאי הפיתוח */}
      {!back && (
        <Html position={[c[0], lot.height + 6, -c[1]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <span
            className={`whitespace-nowrap px-1 text-[0.7rem] ${
              isSel ? 'bg-ink font-semibold text-white' : selectedLot ? 'text-ink/30' : 'bg-white/70 text-ink/80'
            }`}
          >
            {lot.num}
          </span>
        </Html>
      )}
    </group>
  );
}

/** הרובע המיוחד: המגרשים מקובצי התכנית, ומסות סכמטיות לפי טבלת הזכויות */
export default function QuarterModel() {
  const real = usePlanStore((s) => s.renderMode) === 'real';
  return (
    <group>
      {QUARTER.lots.map((lot) => (
        <Lot key={lot.num} lot={lot} real={real} />
      ))}
      {!real &&
        QUARTER.easements.map((ring, i) => (
          <mesh key={`e${i}`} geometry={drapedShape(ring, 0.3)}>
            <meshStandardMaterial color="#7FB36A" transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} roughness={1} />
          </mesh>
        ))}
      {!real &&
        QUARTER.buildingLines.map((ring, i) => (
          <Line key={`b${i}`} points={drapedLine(ring, 0.5)} color="#C0392B" lineWidth={1} dashed dashSize={3} gapSize={2} />
        ))}
      {!real && QUARTER.commercialFronts.map((ring, i) => <Line key={`f${i}`} points={drapedLine(ring, 0.7)} color="#6B5B95" lineWidth={4} />)}
    </group>
  );
}
