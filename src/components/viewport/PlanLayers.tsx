import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONTEXT } from '../../data/contextData';
import { ROUND, ROUNDABOUTS } from '../../data/junctions';
import { usePlanStore } from '../../store/planStore';
import { headings, offsetLine, ribbonGeometry, type Pt } from './geometry';
import { pushRibbonT as pushRibbon, tY } from '../../analysis/terrain';
import { EXISTING_TREES } from '../../data/existingTrees';
import { RULES } from '../../data/rules';
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
  under?: boolean; // משטח שמונח מתחת לכביש: פינות הצומת
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

interface Junction {
  c: Pt;
  r: number; // הרדיוס שבו נעצרות רצועות הרחוב
  road: number; // רדיוס משטח האספלט
  round: boolean;
}
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const KEEP: Pt[] = EXISTING_TREES.filter((t) => t[2] === 'keep').map((t) => [t[0], t[1]]);

/** מאתר צמתים: חיתוך בין שני רחובות, או קצה של רחוב שנפגש ברחוב אחר בזווית */
function findJunctions(): Junction[] {
  const runs = CONTEXT.planRuns;
  const hits: { p: Pt; half: number }[] = [];
  const cross = (a: Pt, b: Pt, c: Pt, d: Pt): Pt | null => {
    const rx = b[0] - a[0];
    const ry = b[1] - a[1];
    const sx = d[0] - c[0];
    const sy = d[1] - c[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-6) return null;
    const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
    const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + rx * t, a[1] + ry * t] : null;
  };
  const head = runs.map((r) => headings(r.pts as Pt[]));
  for (let i = 0; i < runs.length; i++) {
    const A = runs[i].pts as Pt[];
    for (let j = 0; j < runs.length; j++) {
      if (i === j) continue;
      const B = runs[j].pts as Pt[];
      const half = Math.max(runs[i].w, runs[j].w) / 2;
      if (j > i) {
        for (let m = 0; m + 1 < A.length; m++) {
          for (let n = 0; n + 1 < B.length; n++) {
            const x = cross(A[m], A[m + 1], B[n], B[n + 1]);
            if (x) hits.push({ p: x, half });
          }
        }
      }
      // קצה של רחוב שנוגע ברחוב אחר. זווית קטנה: המשך של אותו רחוב או מסלול מקביל, ולא צומת
      for (const e of [0, A.length - 1]) {
        let best = Infinity;
        let bn = -1;
        B.forEach((q, n) => {
          const d = dist(A[e], q);
          if (d < best) {
            best = d;
            bn = n;
          }
        });
        if (best > runs[j].w / 2 + 9) continue;
        if (Math.abs(Math.sin(head[i][e] - head[j][bn])) > 0.5) hits.push({ p: B[bn], half });
      }
    }
  }
  // איחוד נקודות קרובות לצומת אחד: שני מסלולים של אותה שדרה נחתכים פעמיים
  const groups: { pts: Pt[]; half: number }[] = [];
  for (const h of hits) {
    const g = groups.find((k) => k.pts.some((q) => dist(q, h.p) < 30));
    if (g) {
      g.pts.push(h.p);
      g.half = Math.max(g.half, h.half);
    } else groups.push({ pts: [h.p], half: h.half });
  }
  const out: Junction[] = ROUNDABOUTS.map((r) => ({ c: r.c, r: ROUND.clear, road: ROUND.outer, round: true }));
  for (const g of groups) {
    const c: Pt = [g.pts.reduce((a, q) => a + q[0], 0) / g.pts.length, g.pts.reduce((a, q) => a + q[1], 0) / g.pts.length];
    if (out.some((j) => j.round && dist(j.c, c) < 38)) continue;
    const spread = Math.max(...g.pts.map((q) => dist(q, c)));
    // צומת רגיל אינו כיכר: משטח האספלט רק ממלא את הפינה, בלי להתרחב לעיגול
    out.push({ c, r: Math.min(26, g.half + 6.5 + spread * 0.6), road: Math.min(18, g.half * 1.12 + spread * 0.6), round: false });
  }
  return out;
}

/** מוסיף למערך טבעת שטוחה (או עיגול, כשהרדיוס הפנימי אפס) */
function pushDisc(out: number[], c: Pt, r0: number, r1: number, y: number) {
  const N = 40;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const b = ((k + 1) / N) * Math.PI * 2;
    const p = (r: number, t: number) => {
      const [px, py] = [c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r];
      return [px, y + tY(px, py), -py];
    };
    out.push(...p(r1, a), ...p(r1, b), ...p(r0, b));
    if (r0 > 0) out.push(...p(r1, a), ...p(r0, b), ...p(r0, a));
  }
}

function build() {
  const inst = new Map<string, InstGroup>();
  const ribbons = new Map<string, RibbonGroup>();
  const junctions = findJunctions();
  const inJ = (p: Pt) => junctions.some((j) => dist(j.c, p) < j.r);
  const key = (r: PieceRef, shape = '') => `${r.layer}|${r.item}|${r.idx ?? ''}|${r.fixed ?? ''}|${shape}`;
  const put = (ref: PieceRef, shape: Shape, at: Pt, y: number, s: Inst['s'], r = 0) => {
    const k = key(ref, shape);
    if (!inst.has(k)) inst.set(k, { ...ref, shape, list: [] });
    inst.get(k)!.list.push({ p: [at[0], y + tY(at[0], at[1]), -at[1]], s, r });
  };
  // רכיב רחוב רגיל אינו מוצב בתוך צומת
  const add = (ref: PieceRef, shape: Shape, at: Pt, y: number, s: Inst['s'], r = 0) => {
    if (!inJ(at)) put(ref, shape, at, y, s, r);
  };
  const band = (ref: PieceRef, tag = '', realOnly = false, under = false) => {
    const k = key(ref) + tag;
    if (!ribbons.has(k)) ribbons.set(k, { ...ref, positions: [], realOnly, under });
    return ribbons.get(k)!.positions;
  };
  // רצועה לאורך הרחוב, שנקטעת בכניסה לצומת
  const strip = (ref: PieceRef, pts: Pt[], width: number, y: number, through = false) => {
    if (through) return pushRibbon(band(ref), pts, width, y);
    let part: Pt[] = [];
    const flush = () => {
      if (part.length > 1) pushRibbon(band(ref), part, width, y);
      part = [];
    };
    for (const p of pts) {
      if (inJ(p)) flush();
      else part.push(p);
    }
    flush();
  };

  // משטחי הצומת: ריצוף בפינות, אספלט במרכז, ובכיכר גם אי מגונן עם עץ
  const PAVE: PieceRef = { layer: 'paving', item: 'paving-main', idx: 0 };
  const ASPHALT: PieceRef = { layer: 'road', item: 'road', fixed: '#5B5C5F' };
  for (const j of junctions) {
    pushDisc(band(PAVE, 'j', false, true), j.c, 0, j.r, 0.05);
    pushDisc(band(ASPHALT), j.c, 0, j.road, 0.09);
    if (j.round) {
      pushDisc(band({ layer: 'paving', item: 'paving-main', idx: 1 }), j.c, ROUND.island, ROUND.apron, 0.2);
      pushDisc(band({ layer: 'planting', item: 'groundcover', idx: 0 }), j.c, 0, ROUND.island, 0.26);
      const tree: PieceRef = { layer: 'planting', item: 'trees-main', idx: 0 };
      put({ ...tree, idx: undefined, fixed: '#7A6652' }, 'cyl', j.c, 1.6, [0.22, 3.2, 0.22]);
      put(tree, 'sphere', j.c, 5, [3, 2.4, 3]);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        put({ layer: 'planting', item: 'groundcover', idx: k % 5 }, 'sphere', [j.c[0] + Math.cos(a) * 5, j.c[1] + Math.sin(a) * 5], 0.45, [0.9, 0.5, 0.9]);
      }
    }
  }

  /** המרחק אל המסלול המקביל של אותו רחוב בצד הנתון, או null כשאין כזה */
  const twinGap = (ri: number, side: number): number | null => {
    const run = CONTEXT.planRuns[ri];
    const pts = run.pts as Pt[];
    const probe = offsetLine(pts, side * (run.w / 2 + 6));
    let hits = 0;
    let sum = 0;
    for (let i = 0; i < pts.length; i += 3) {
      let best = Infinity;
      CONTEXT.planRuns.forEach((o, oi) => {
        if (oi === ri || o.n !== run.n) return;
        for (const q of o.pts as Pt[]) best = Math.min(best, dist(q, probe[i]));
      });
      if (best < 14) {
        hits++;
        sum += Math.max(0, dist(pts[i], probe[i]) + best - run.w);
      }
    }
    return hits >= Math.max(2, pts.length / 6) ? Math.min(14, sum / hits + 2) : null;
  };

  CONTEXT.planRuns.forEach((run, ri) => {
    const half = run.w / 2;
    const line = run.pts as Pt[];
    strip({ layer: 'road', item: 'road', fixed: '#5B5C5F' }, line, run.w, 0.08, true);
    const ang = headings(line);
    for (const side of [1, -1]) {
      const at = (d: number) => offsetLine(line, side * (half + d));
      // שדרה עם שני מסלולים: בצד הפנימי אין מדרכה, אלא אי תנועה מגונן שממלא את הרווח
      const gap = twinGap(ri, side);
      if (gap !== null) {
        strip({ layer: 'planting', item: 'groundcover', idx: 0 }, at(gap / 4), gap / 2 + 0.4, 0.14);
        continue;
      }
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
        // עץ קיים לשימור גובר: לא נוטעים עץ חדש קרוב אליו מהמרחק שבאוגדן ההיתר
        if (KEEP.some((k) => dist(k, p) < RULES.ogdanTree.v)) return;
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
    // נגישות: מעבר חצייה בכל כניסה של הרחוב לצומת, ומשטח אזהרה בשתי המדרכות
    for (let i = 0; i + 1 < line.length; i++) {
      const a = inJ(line[i]);
      const b = inJ(line[i + 1]);
      if (a === b) continue;
      const k = a ? i + 1 : i;
      const p = line[k];
      const n: Pt = [-Math.sin(ang[k]), Math.cos(ang[k])];
      for (let t = -half + 0.6; t <= half - 0.6; t += 1.1) {
        put({ layer: 'accessibility', item: 'accessibility-main', idx: 1 }, 'box', [p[0] + n[0] * t, p[1] + n[1] * t], 0.13, [3, 0.05, 0.55], ang[k]);
      }
      for (const sd of [1, -1]) {
        put({ layer: 'accessibility', item: 'accessibility-main', idx: 0 }, 'box', [p[0] + n[0] * sd * (half + 0.7), p[1] + n[1] * sd * (half + 0.7)], 0.2, [3, 0.1, 0.8], ang[k]);
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
  const topics = usePlanStore((s) => s.topics);
  if (g.realOnly && !real) return null;
  // ריצוף: דוגמת האבן של החלופה שנבחרה
  const alt = g.layer === 'paving' ? topics.find((t) => t.id === 'paving')?.items.find((i) => i.id === g.item)?.selectedAlternativeId : undefined;
  const map = alt && PAVE_OF[alt] && !style.ghost ? paveTexture(PAVE_OF[alt]) : null;
  return (
    <mesh
      geometry={geo}
      renderOrder={g.under ? 0 : g.layer === 'road' ? 1 : 2}
      receiveShadow={real}
      onClick={(e) => {
        e.stopPropagation();
        pick(g);
      }}
    >
      <meshStandardMaterial
        key={map ? 'tex' : 'flat'}
        polygonOffset
        polygonOffsetFactor={g.under ? -1 : g.layer === 'road' ? -2 : -4}
        polygonOffsetUnits={g.under ? -1 : g.layer === 'road' ? -2 : -4}
        map={map}
        color={g.layer === 'road' && !real ? '#9A9A9C' : style.color}
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
