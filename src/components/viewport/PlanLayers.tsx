import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONTEXT } from '../../data/contextData';
import { usePlanStore } from '../../store/planStore';
import { headings, offsetLine, pushRibbon, ribbonGeometry, type Pt } from './geometry';
import { resolveStyle, type PieceRef } from './layerStyle';

/**
 * שכבות הפיתוח על רחובות התוכנית עצמה.
 * הרחובות אמיתיים (קטעים שלצד המגרשים). המיקום של כל רכיב לאורכם סכמטי:
 * המרווחים לפי הדרישות שב-data/rules.ts: עץ כל 6 מ', פתח נטיעה 1.2 על 2.4 מ',
 * עמוד תאורה 3 מ' מגזע, וספסל כל 48 מ' בכל צד.
 */

type Shape = 'box' | 'sphere' | 'cone' | 'cyl';
interface Inst {
  p: [number, number, number];
  s: [number, number, number];
  r: number;
}
interface InstGroup extends PieceRef {
  shape: Shape;
  list: Inst[];
}
interface RibbonGroup extends PieceRef {
  positions: number[];
}

/** נוף עץ ריאליסטי: שלושה גושים חופפים במקום כדור אחד */
const CROWN = (() => {
  const blob = (x: number, y: number, z: number, r: number) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate(x, y, z);
    return g;
  };
  return mergeGeometries([blob(0, 0, 0, 0.82), blob(0.5, 0.18, 0.22, 0.6), blob(-0.42, 0.1, -0.34, 0.66), blob(0.05, 0.42, -0.1, 0.56)])!;
})();

const GEO: Record<Shape, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  cone: new THREE.ConeGeometry(1, 1, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
};

function build() {
  const inst = new Map<string, InstGroup>();
  const ribbons = new Map<string, RibbonGroup>();
  const key = (r: PieceRef, shape = '') => `${r.layer}|${r.item}|${r.idx ?? ''}|${r.fixed ?? ''}|${shape}`;
  const add = (ref: PieceRef, shape: Shape, at: Pt, y: number, s: Inst['s'], r = 0) => {
    const k = key(ref, shape);
    if (!inst.has(k)) inst.set(k, { ...ref, shape, list: [] });
    inst.get(k)!.list.push({ p: [at[0], y, -at[1]], s, r });
  };
  const strip = (ref: PieceRef, pts: Pt[], width: number, y: number) => {
    const k = key(ref);
    if (!ribbons.has(k)) ribbons.set(k, { ...ref, positions: [] });
    pushRibbon(ribbons.get(k)!.positions, pts, width, y);
  };

  CONTEXT.planRuns.forEach((run, ri) => {
    const half = run.w / 2;
    strip({ layer: 'road', item: 'road', fixed: '#5B5C5F' }, run.pts, run.w, 0.08);
    const ang = headings(run.pts);
    for (const side of [1, -1]) {
      const at = (d: number) => offsetLine(run.pts, side * (half + d));
      // ריצוף, לפי אזורי החלופה שנבחרה: רצועת הליכה, רצועת שירות, ורצועת חנייה בשולי הכביש
      strip({ layer: 'paving', item: 'paving-main', idx: 0 }, at(4.4), 3.2, 0.16);
      strip({ layer: 'paving', item: 'paving-main', idx: 1 }, at(2.3), 1, 0.18);
      strip({ layer: 'paving', item: 'paving-main', idx: 2 }, at(-1.1), 2.2, 0.12);
      // ניקוז: רצועת ביוסוואל, ואזור חדירה כל 36 מ'
      const swale = at(1.1);
      strip({ layer: 'water', item: 'bioswale', idx: 0 }, swale, 1.4, 0.1);
      for (let i = 2; i + 1 < swale.length; i += 6) {
        strip({ layer: 'water', item: 'bioswale', idx: 1 }, [swale[i], swale[i + 1]], 1.1, 0.14);
      }
      const lamps = at(2.2);
      const seats = at(5.4);
      swale.forEach((p, i) => {
        const shift = side > 0 ? 0 : 1;
        // פתח נטיעה מלבני, 1.2 על 2.4 מ' (המינימום בהוראות התכנית), ועץ בכל 6 מ'
        add({ layer: 'planting-pits', item: 'pits-main', idx: 0 }, 'box', p, 0.2, [2.4, 0.08, 1.2], ang[i]);
        const kind = (i + ri + shift) % 3;
        const tree: PieceRef = { layer: 'planting', item: 'trees-main', idx: kind };
        add({ ...tree, idx: undefined, fixed: '#7A6652' }, 'cyl', p, kind === 2 ? 0.5 : 1.3, [0.16, kind === 2 ? 1 : 2.6, 0.16]);
        if (kind === 2) add(tree, 'cone', p, 3.8, [0.9, 5.8, 0.9]);
        else add(tree, 'sphere', p, 3.9, kind === 0 ? [1.8, 1.6, 1.8] : [2.2, 1.05, 2.2]);
        // כיסוי קרקע בין העצים
        if (i + 1 < swale.length) {
          const q = swale[i + 1];
          const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
          add({ layer: 'planting', item: 'groundcover', idx: (i + ri * 2 + shift * 3) % 5 }, 'sphere', mid, 0.3, [0.55, 0.35, 0.55]);
        }
        // עמוד תאורה כל 30 מ', באמצע בין שני עצים: 3 מ' מכל גזע
        if (i % 5 === 2 && i + 1 < lamps.length) {
          const l: Pt = [(lamps[i][0] + lamps[i + 1][0]) / 2, (lamps[i][1] + lamps[i + 1][1]) / 2];
          add({ layer: 'lighting', item: 'lighting-main', idx: 0 }, 'cyl', l, 2.6, [0.1, 5.2, 0.1]);
          add({ layer: 'lighting', item: 'lighting-main', idx: 0 }, 'box', l, 5.2, [0.5, 0.16, 1.6], ang[i]);
        }
        // ספסל כל 48 מ' בכל צד, לסירוגין בין הצדדים
        if ((i + (side > 0 ? 0 : 4)) % 8 === 4) {
          add({ layer: 'furniture', item: 'furniture-main', idx: 0 }, 'box', seats[i], 0.45, [1.8, 0.45, 0.5], ang[i]);
          if (i + 1 < seats.length) add({ layer: 'furniture', item: 'furniture-main', idx: 1 }, 'cyl', seats[i + 1], 0.55, [0.24, 0.8, 0.24]);
        }
      });
    }
    // נגישות: משטח אזהרה בשני קצות הקטע, ומעבר חצייה בתחילתו
    const ends = [0, run.pts.length - 1];
    for (const e of ends) {
      add({ layer: 'accessibility', item: 'accessibility-main', idx: 0 }, 'box', run.pts[e], 0.25, [0.8, 0.1, run.w + 6], ang[e]);
    }
    for (const k of [1, 2, 3]) {
      if (k < run.pts.length) {
        const a = run.pts[k - 1];
        const b = run.pts[k];
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        add({ layer: 'accessibility', item: 'accessibility-main', idx: 1 }, 'box', mid, 0.22, [0.9, 0.06, run.w], ang[k]);
      }
    }
  });
  return { inst: [...inst.values()], ribbons: [...ribbons.values()] };
}

const useReal = () => usePlanStore((s) => s.renderMode) === 'real';

function useStyle(ref: PieceRef) {
  const real = useReal();
  const topics = usePlanStore((s) => s.topics);
  const topicId = usePlanStore((s) => s.selectedTopicId);
  const itemId = usePlanStore((s) => s.selectedItemId);
  const focus = usePlanStore((s) => s.legendFocus);
  return resolveStyle(ref, topics, topicId, itemId, focus, real);
}

function pick(ref: PieceRef) {
  const { selectTopic } = usePlanStore.getState();
  selectTopic(ref.layer, ref.item);
}

function Instances({ g }: { g: InstGroup }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const style = useStyle(g);
  const real = useReal();
  const crown = real && g.shape === 'sphere' && g.layer === 'planting';
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const tint = new THREE.Color();
    g.list.forEach((it, i) => {
      // בהדמיה הריאליסטית כל עץ מקבל סיבוב, גודל וגוון מעט שונים
      const k = real ? 0.85 + ((i * 37) % 30) / 100 : 1;
      o.position.set(...it.p);
      o.scale.set(it.s[0] * k, it.s[1] * (crown ? 1.25 * k : 1), it.s[2] * k);
      o.rotation.set(0, real && g.shape !== 'box' ? i * 1.7 : it.r, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const l = real ? 0.78 + ((i * 53) % 40) / 100 : 1;
      m.setColorAt(i, tint.setScalar(l));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [g, real, crown]);
  return (
    <instancedMesh
      ref={mesh}
      key={crown ? 'crown' : 'plain'}
      args={[crown ? CROWN : GEO[g.shape], undefined, g.list.length]}
      castShadow={real}
      receiveShadow={real}
      onClick={(e) => {
        e.stopPropagation();
        pick(g);
      }}
    >
      <meshStandardMaterial
        color={style.color}
        transparent
        opacity={style.opacity}
        wireframe={style.ghost}
        depthWrite={style.opacity > 0.85 && !style.ghost}
        roughness={0.9}
      />
    </instancedMesh>
  );
}

function Ribbon({ g }: { g: RibbonGroup }) {
  const geo = useMemo(() => ribbonGeometry(g.positions), [g]);
  const style = useStyle(g);
  const real = useReal();
  // הכביש עצמו מוצג רק בהדמיה הריאליסטית. במודל הוא חלק מסכמת הרחובות
  if (g.layer === 'road' && !real) return null;
  return (
    <mesh
      geometry={geo}
      receiveShadow={real}
      onClick={(e) => {
        e.stopPropagation();
        pick(g);
      }}
    >
      <meshStandardMaterial
        color={style.color}
        transparent
        opacity={style.opacity}
        wireframe={style.ghost}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.95}
      />
    </mesh>
  );
}

export default function PlanLayers() {
  const { inst, ribbons } = useMemo(build, []);
  return (
    <group>
      {ribbons.map((g, i) => (
        <Ribbon key={`r${i}`} g={g} />
      ))}
      {inst.map((g, i) => (
        <Instances key={`i${i}`} g={g} />
      ))}
    </group>
  );
}
