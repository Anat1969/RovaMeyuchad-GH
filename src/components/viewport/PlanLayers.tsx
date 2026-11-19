import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { usePlanStore } from '../../store/planStore';
import { ribbonGeometry, type Pt } from './geometry';
import { tY } from '../../analysis/terrain';
import { EXISTING_TREES } from '../../data/existingTrees';
import { RULES } from '../../data/rules';
import { ROADS, type Area } from '../../data/roadData';
import { QUARTER } from '../../data/quarterData';
import { drapedShape } from '../../analysis/terrain';
import { PAVE_OF, paveTexture } from './paveTex';
import { resolveStyle, type PieceRef } from './layerStyle';

/**
 * שכבות הפיתוח על רחובות התוכנית עצמה.
 * הרחובות אמיתיים (קטעים שלצד המגרשים). המיקום של כל רכיב לאורכם סכמטי:
 * המרווחים לפי הדרישות שב-data/rules.ts: עץ כל 6 מ', פתח נטיעה 1.2 על 2.4 מ',
 * עמוד תאורה 3 מ' מגזע, וספסל כל 48 מ' בכל צד.
 * בצמתים ובכיכרות הרצועות והעצים נעצרים, ובמקומם: פינות מרוצפות, מעברי חצייה ואי מרכזי.
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
  realOnly?: boolean; // מוצג רק בהדמיה הריאליסטית
  under?: boolean; // משטח שמונח מתחת לכביש: המדרכה
  top?: boolean; // סימון על הכביש: מעבר חצייה
  geo?: THREE.BufferGeometry; // משטח מוכן, במקום רצועה לאורך קו
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

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const KEEP: Pt[] = EXISTING_TREES.filter((t) => t[2] === 'keep').map((t) => [t[0], t[1]]);
/** גובה כל שכבה מעל הקרקע. הפרש הגובה שומר על סדר השכבות גם ממרחק */
const LIFT = { walk: 0.3, road: 0.38, strip: 0.43, swale: 0.47 };

/**
 * הדרכים נבנות משטחי זכות הדרך שבתשריט המצב המאושר (data/roadData.ts), ולא מרצועות לאורך קווים.
 * לכן המדרכות והכבישים הם צורה אחת רציפה, עם הצמתים והכיכרות כפי שהם בתכנית.
 * העצים, פתחי הנטיעה, התאורה והספסלים ממוקמים לאורך אבן השפה של אותה צורה, כל 6 מ'.
 */
function build() {
  const inst = new Map<string, InstGroup>();
  const key = (r: PieceRef, shape = '') => `${r.layer}|${r.item}|${r.idx ?? ''}|${r.fixed ?? ''}|${shape}`;
  const put = (ref: PieceRef, shape: Shape, at: Pt, y: number, s: Inst['s'], r = 0) => {
    const k = key(ref, shape);
    if (!inst.has(k)) inst.set(k, { ...ref, shape, list: [] });
    inst.get(k)!.list.push({ p: [at[0], y + tY(at[0], at[1]), -at[1]], s, r });
  };
  const surface = (ref: PieceRef, areas: Area[], lift: number, under = false): RibbonGroup => ({
    ...ref,
    positions: [],
    under,
    geo: mergeGeometries(areas.map((a) => drapedShape(a.o, lift, a.h)))!,
  });
  const ribbons: RibbonGroup[] = [
    surface({ layer: 'paving', item: 'paving-main', idx: 0 }, ROADS.row, LIFT.walk, true),
    surface({ layer: 'road', item: 'road', fixed: '#5B5C5F' }, ROADS.road, LIFT.road),
    surface({ layer: 'paving', item: 'paving-main', idx: 1 }, ROADS.strip, LIFT.strip),
    surface({ layer: 'water', item: 'bioswale', idx: 0 }, ROADS.swale, LIFT.swale),
    // אי תנועה מגונן בכבישים הרחבים, ומעברי חצייה בכניסה לכל צומת
    surface({ layer: 'planting', item: 'groundcover', idx: 0 }, ROADS.median, LIFT.road + 0.08),
    { ...surface({ layer: 'road', item: 'road', fixed: '#E4E0D8' }, ROADS.cross, LIFT.road + 0.06), top: true },
  ];

  // עץ במרכז כל כיכר
  for (const [x, y, r] of ROADS.rounds) {
    const tree: PieceRef = { layer: 'planting', item: 'trees-main', idx: 0 };
    put({ ...tree, idx: undefined, fixed: '#7A6652' }, 'cyl', [x, y], 1.9, [0.22, 3.2, 0.22]);
    put(tree, 'sphere', [x, y], 5.2, [Math.min(3, r * 0.6), 2.4, Math.min(3, r * 0.6)]);
  }

  ROADS.curb.forEach(([x, y, nx, ny], i) => {
    const p: Pt = [x, y];
    // עץ קיים לשימור גובר: לא נוטעים עץ חדש קרוב אליו מהמרחק שבאוגדן ההיתר
    if (KEEP.some((k) => dist(k, p) < RULES.ogdanTree.v)) return;
    const [tx, ty] = [-ny, nx]; // כיוון הרחוב
    const ang = Math.atan2(ty, tx);
    put({ layer: 'planting-pits', item: 'pits-main', idx: 0 }, 'box', p, LIFT.swale + 0.05, [2.4, 0.08, 1.2], ang);
    const kind = i % 3;
    const tree: PieceRef = { layer: 'planting', item: 'trees-main', idx: kind };
    put({ ...tree, idx: undefined, fixed: '#7A6652' }, 'cyl', p, kind === 2 ? 0.5 : 1.3, [0.16, kind === 2 ? 1 : 2.6, 0.16]);
    if (kind === 2) put(tree, 'cone', p, 3.8, [0.9, 5.8, 0.9]);
    else put(tree, 'sphere', p, 3.9, kind === 0 ? [1.8, 1.6, 1.8] : [2.2, 1.05, 2.2]);
    // כיסוי קרקע בין העצים
    const mid: Pt = [x + tx * 3, y + ty * 3];
    put({ layer: 'planting', item: 'groundcover', idx: i % 5 }, 'sphere', mid, LIFT.swale + 0.2, [0.55, 0.35, 0.55]);
    // עמוד תאורה כל 30 מ', באמצע בין שני עצים
    if (i % 5 === 2) {
      put({ layer: 'lighting', item: 'lighting-main', idx: 0 }, 'cyl', mid, 2.6, [0.1, 5.2, 0.1]);
      put({ layer: 'lighting', item: 'lighting-main', idx: 0 }, 'box', mid, 5.2, [0.5, 0.16, 1.6], ang);
    }
    // ספסל כל 48 מ', על המדרכה, ולידו פח
    if (i % 8 === 4) {
      put({ layer: 'furniture', item: 'furniture-main', idx: 0 }, 'box', [x + nx * 2.6, y + ny * 2.6], 0.75, [1.8, 0.45, 0.5], ang);
      put({ layer: 'furniture', item: 'furniture-main', idx: 1 }, 'cyl', [x + nx * 2.6 + tx * 1.6, y + ny * 2.6 + ty * 1.6], 0.85, [0.24, 0.8, 0.24]);
    }
    // נגישות: משטח אזהרה בשפת המדרכה, כל 60 מ'
    if (i % 10 === 7) put({ layer: 'accessibility', item: 'accessibility-main', idx: 0 }, 'box', [x - nx * 1, y - ny * 1], LIFT.swale + 0.05, [1.8, 0.08, 0.6], ang);
  });
  return { inst: [...inst.values()], ribbons };
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
  const geo = useMemo(() => g.geo ?? ribbonGeometry(g.positions), [g]);
  const style = useStyle(g);
  const real = useReal();
  const topics = usePlanStore((s) => s.topics);
  if (g.realOnly && !real) return null;
  // ריצוף: דוגמת האבן של החלופה שנבחרה
  const alt = g.layer === 'paving' ? topics.find((t) => t.id === 'paving')?.items.find((i) => i.id === g.item)?.selectedAlternativeId : undefined;
  const map = alt && PAVE_OF[alt] && !style.ghost ? paveTexture(PAVE_OF[alt]) : null;
  return (
    <mesh
      geometry={geo}
      renderOrder={g.top ? 3 : g.under ? 0 : g.layer === 'road' ? 1 : 2}
      receiveShadow={real}
      onClick={(e) => {
        e.stopPropagation();
        pick(g);
      }}
    >
      <meshStandardMaterial
        key={map ? 'tex' : 'flat'}
        polygonOffset
        polygonOffsetFactor={g.top ? -6 : g.under ? -1 : g.layer === 'road' ? -2 : -4}
        polygonOffsetUnits={g.top ? -6 : g.under ? -1 : g.layer === 'road' ? -2 : -4}
        map={map}
        color={g.top ? '#E4E0D8' : g.layer === 'road' && !real ? '#9A9A9C' : style.color}
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

/** שבילים חוצי רובע: מוצגים על זיקות ההנאה למעבר הציבור שבתכנית, בדוגמת החלופה שנבחרה */
function Paths() {
  const ref: PieceRef = { layer: 'paving', item: 'paving-paths', idx: 0 };
  const style = useStyle(ref);
  const topics = usePlanStore((s) => s.topics);
  const geos = useMemo(() => QUARTER.easements.map((r) => drapedShape(r as Pt[], 0.45)), []);
  const alt = topics.find((t) => t.id === 'paving')?.items.find((i) => i.id === 'paving-paths')?.selectedAlternativeId;
  const map = alt && PAVE_OF[alt] ? paveTexture(PAVE_OF[alt]) : null;
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} renderOrder={2} onClick={(e) => (e.stopPropagation(), pick(ref))}>
          <meshStandardMaterial key={map ? 'tex' : 'flat'} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} map={map} color={style.color} transparent opacity={style.opacity} side={THREE.DoubleSide} depthWrite={false} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export default function PlanLayers() {
  const { inst, ribbons } = useMemo(build, []);
  const sheetOn = usePlanStore((s) => s.appendix) !== null;
  // בשלב התב"ע מוצג רק המידע הסטטוטורי. שכבות הפיתוח הן תכנון האדריכל
  const statutory = usePlanStore((s) => s.stage) === 1;
  if (sheetOn || statutory) return null;
  return (
    <group>
      <Paths />
      {ribbons.map((g, i) => (
        <Ribbon key={`r${i}`} g={g} />
      ))}
      {inst.map((g, i) => (
        <Instances key={`i${i}`} g={g} />
      ))}
    </group>
  );
}
