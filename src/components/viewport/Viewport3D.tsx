import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import QuarterModel from './QuarterModel';
import PlanLayers from './PlanLayers';
import ContextLayer from './ContextLayer';
import PublicLots from './PublicLots';
import { IconBtn } from '../ui/Icon';
import { DESIGNS } from '../../data/designData';
import { CONTEXT } from '../../data/contextData';
import { usePlanStore, useSelection } from '../../store/planStore';
import type { CameraView } from '../../types/plan';

type V3 = [number, number, number];
type View = { pos: V3; target: V3 };

// מבט קרוב לנושאי הפיתוח: מעל אמצע קטע הרחוב הארוך ביותר שלצד המגרשים
const DETAIL: View = (() => {
  const run = [...CONTEXT.planRuns].sort((a, b) => b.pts.length - a.pts.length)[0];
  const [x, y] = run.pts[Math.floor(run.pts.length / 2)];
  return { pos: [x - 95, 75, -y + 120], target: [x, 0, -y] };
})();

const VIEWS: Record<CameraView | 'detail', View> = {
  top: { pos: [0, 1650, 1], target: [0, 0, 0] },
  perspective: { pos: [-190, 690, 1090], target: [0, 0, 40] },
  street: { pos: [-780, 70, 330], target: [-150, 40, -20] },
  detail: DETAIL,
};

/** במסך צר הרובע רחב מהחלון, ולכן המצלמה מתרחקת */
function viewOf(name: CameraView | 'detail'): View {
  const v = VIEWS[name];
  if ((name !== 'top' && name !== 'perspective') || window.innerWidth >= 768) return v;
  return { pos: [v.pos[0] * 2, v.pos[1] * 2, v.pos[2] * 2], target: v.target };
}

/** מניע את המצלמה ברכות אל המבט שנבחר, ומפסיק כשהמשתמש מזיז בעצמו */
function CameraRig() {
  const view = usePlanStore((s) => s.view);
  const zoom = usePlanStore((s) => s.zoom);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
    addEventListener: (t: string, f: () => void) => void;
    removeEventListener: (t: string, f: () => void) => void;
  } | null;
  const moving = useRef(false);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (view.tick === 0) return;
    const v = viewOf(view.name);
    pos.set(...v.pos);
    tgt.set(...v.target);
    moving.current = true;
  }, [view, pos, tgt]);

  // כפתורי הגדלה והקטנה: מתקרבים אל נקודת המבט או מתרחקים ממנה
  useEffect(() => {
    if (zoom.tick === 0 || !controls) return;
    tgt.copy(controls.target);
    pos.copy(camera.position).sub(tgt).multiplyScalar(zoom.dir > 0 ? 0.6 : 1.65).add(tgt);
    moving.current = true;
  }, [zoom, camera, controls, pos, tgt]);

  // זום למלבן: נקודת המבט עוברת למרכז המלבן על הקרקע, והמצלמה מתקרבת באותו כיוון לפי גודל המלבן
  const box = usePlanStore((s) => s.box);
  useEffect(() => {
    if (box.tick === 0 || !controls) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(box.nx, box.ny), camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!hit) return;
    const offset = camera.position.clone().sub(controls.target);
    const dist = Math.max(18, camera.position.distanceTo(hit) * box.scale);
    tgt.copy(hit);
    pos.copy(hit).addScaledVector(offset.normalize(), dist);
    moving.current = true;
  }, [box, camera, controls, pos, tgt]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => (moving.current = false);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!moving.current || !controls) return;
    const k = Math.min(1, dt * 4);
    camera.position.lerp(pos, k);
    controls.target.lerp(tgt, k);
    controls.update();
    if (camera.position.distanceTo(pos) < 0.5) moving.current = false;
  });
  return null;
}

const SUN = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();

/** שמיים, שמש וצללים להדמיה הריאליסטית. מפת הצל נעה עם נקודת המבט */
function RealLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  // גבולות מפת הצל נקבעים כאן, כי שינוי שלהם מחייב עדכון של מטריצת ההיטל
  useEffect(() => {
    const cam = light.current?.shadow.camera;
    if (!cam) return;
    cam.left = cam.bottom = -720;
    cam.right = cam.top = 720;
    cam.near = 10;
    cam.far = 2200;
    cam.updateProjectionMatrix();
  }, []);
  useFrame(() => {
    const l = light.current;
    if (!l || !controls) return;
    l.position.copy(controls.target).addScaledVector(SUN, 1000);
    l.target.position.copy(controls.target);
    l.target.updateMatrixWorld();
  });
  return (
    <>
      <Sky distance={40000} sunPosition={SUN.toArray()} turbidity={5} rayleigh={1.4} mieCoefficient={0.006} mieDirectionalG={0.8} />
      <fog attach="fog" args={['#DCE6EE', 2500, 22000]} />
      <hemisphereLight args={['#DDEBFA', '#B7A486', 1.15]} />
      <directionalLight
        ref={light}
        castShadow
        intensity={3.4}
        color="#FFF1DC"
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.8}
      />
    </>
  );
}

/** מיפוי הגוונים: במודל הצבעים זהים למקרא, ובהדמיה הריאליסטית הם רכים כמו בצילום */
function Tone({ real }: { real: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    gl.toneMapping = real ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = real ? 0.82 : 1;
    gl.shadowMap.enabled = real;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => (x.needsUpdate = true));
    });
  }, [gl, scene, real]);
  return null;
}

const RENDERS = [
  { src: '/renders/path-seating.jpg', name: 'שביל חוצה רובע עם מקומות ישיבה' },
  { src: '/renders/path-evening.jpg', name: 'שביל, גינון ושביל אופניים' },
  { src: '/renders/street-top-large.jpg', name: 'חתך הרחוב במבט מלמעלה' },
];


export default function Viewport3D() {
  const { topic } = useSelection();
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const mode = usePlanStore((s) => s.contextMode);
  const setMode = usePlanStore((s) => s.setContextMode);
  const zoomBy = usePlanStore((s) => s.zoomBy);
  const render = usePlanStore((s) => s.renderMode);
  const setRender = usePlanStore((s) => s.setRenderMode);
  const lightbox = usePlanStore((s) => s.lightbox);
  const setLightbox = usePlanStore((s) => s.setLightbox);
  const real = render === 'real';
  const massMode = usePlanStore((s) => s.massMode);
  const setMassMode = usePlanStore((s) => s.setMassMode);
  const viewName = usePlanStore((s) => s.view.name);
  const setView = usePlanStore((s) => s.setView);
  const zoomToBox = usePlanStore((s) => s.zoomToBox);
  // כלי הזום למלבן: גוררים מלבן על המודל
  const [boxMode, setBoxMode] = useState(false);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  useEffect(() => {
    if (!boxMode) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (setBoxMode(false), setDrag(null));
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [boxMode]);
  const [start] = useState(() => viewOf(usePlanStore.getState().view.name));
  const development = topic !== null && topic.id !== 'massing' && topic.id !== 'public';

  return (
    <div className="viewport-canvas relative h-full w-full bg-sand">
      <Canvas
        camera={{ position: start.pos, fov: 42, near: 1, far: 60000 }}
        dpr={[1, 2]}
        shadows
        onPointerMissed={() => selectTopic(null)}
      >
        <Tone real={real} />
        <color attach="background" args={['#F5F0EB']} />
        {real ? (
          <RealLight />
        ) : (
          <>
            <hemisphereLight args={['#FFFFFF', '#E6DED3', 1.7]} />
            <directionalLight position={[-140, 260, 160]} intensity={1.9} />
            <directionalLight position={[180, 100, -120]} intensity={0.5} />
          </>
        )}
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          zoomToCursor
          zoomSpeed={1.2}
          target={start.target}
          maxPolarAngle={Math.PI / 2 - 0.03}
          minDistance={12}
          maxDistance={16000}
        />
        <CameraRig />
        <ContextLayer />
        <QuarterModel />
        <PublicLots />
        <PlanLayers />
      </Canvas>

      {/* סרגל כלים אנכי, באייקונים: הדמיה, מודל, מבט, רקע וזום. התווית בריחוף */}
      <div className="no-print absolute left-3 top-3 flex flex-col gap-1 bg-white/90 p-1 shadow-md" role="toolbar" aria-label="כלי ההדמיה">
        <IconBtn icon="model" label="הדמיית מודל: צבעי המקרא" on={!real} onClick={() => setRender('model')} />
        <IconBtn icon="real" label="הדמיה ריאליסטית: שמש, צללים ותצלום אוויר" on={real} onClick={() => setRender('real')} />
        <span className="my-0.5 h-px bg-ink/15" />
        <IconBtn icon="rights" label='מודל הזכויות: המעטפת המרבית לפי התב"ע' on={massMode === 'rights'} onClick={() => setMassMode('rights')} />
        <IconBtn icon="design" label="מודל התכנון: הבניינים לפי תכנון האדריכל" on={massMode === 'design'} onClick={() => setMassMode('design')} />
        <span className="my-0.5 h-px bg-ink/15" />
        <IconBtn icon="top" label="תצוגה עילית" on={viewName === 'top'} onClick={() => setView('top')} />
        <IconBtn icon="perspective" label="פרספקטיבה" on={viewName === 'perspective'} onClick={() => setView('perspective')} />
        <IconBtn icon="street" label="תצוגת רחוב" on={viewName === 'street'} onClick={() => setView('street')} />
        <span className="my-0.5 h-px bg-ink/15" />
        <IconBtn icon="map" label="רקע: סכמת רחובות" on={!real && mode === 'schematic'} disabled={real} onClick={() => setMode('schematic')} />
        <IconBtn icon="satellite" label="רקע: תצלום לוויין" on={real || mode === 'satellite'} disabled={real} onClick={() => setMode('satellite')} />
        <IconBtn icon="none" label="בלי רקע" on={!real && mode === 'none'} disabled={real} onClick={() => setMode('none')} />
        <span className="my-0.5 h-px bg-ink/15" />
        <IconBtn icon="box" label="זום למלבן: סמני מלבן על קטע רחוב" on={boxMode} onClick={() => setBoxMode((b) => !b)} />
        <IconBtn icon="zoomIn" label="התקרבות" onClick={() => zoomBy(1)} />
        <IconBtn icon="zoomOut" label="התרחקות" onClick={() => zoomBy(-1)} />
      </div>

      {/* שכבת הסימון של כלי הזום למלבן */}
      {boxMode && (
        <div
          className="no-print absolute inset-0 z-10 cursor-crosshair touch-none"
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag({ x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top });
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            const r = e.currentTarget.getBoundingClientRect();
            setDrag({ ...drag, x1: e.clientX - r.left, y1: e.clientY - r.top });
          }}
          onPointerUp={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            if (drag) {
              const w = Math.abs(drag.x1 - drag.x0);
              const h = Math.abs(drag.y1 - drag.y0);
              if (w > 12 && h > 12) {
                const cx = (drag.x0 + drag.x1) / 2;
                const cy = (drag.y0 + drag.y1) / 2;
                zoomToBox((cx / r.width) * 2 - 1, -((cy / r.height) * 2 - 1), Math.max(w / r.width, h / r.height));
                setBoxMode(false);
              }
            }
            setDrag(null);
          }}
        >
          {drag && (
            <div
              className="absolute bg-ink/10 outline-dashed outline-2 outline-ink"
              style={{ left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1), width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0) }}
            />
          )}
          <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 bg-ink px-3 py-1 text-sm text-white">
            גררי מלבן סביב קטע הרחוב שרוצים להגדיל. Esc מבטל.
          </p>
        </div>
      )}

      {/* הדמיות צוות התכנון: התמונות הריאליסטיות באמת, לצד הדמיית הזמן-אמת */}
      {real && (
        <div className="no-print absolute bottom-20 left-14 bg-white/90 p-2 shadow-md">
          <p className="mb-1 text-xs font-semibold">הדמיות צוות התכנון, מתוך המצגת</p>
          <div className="flex gap-1">
            {RENDERS.map((r) => (
              <button key={r.src} title={`${r.name}. לחיצה מגדילה`} onClick={() => setLightbox(r.src)} className="block hover:shadow-lg">
                <img src={r.src} alt={r.name} className="h-20 w-32 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {lightbox && (
        <button
          className="no-print absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
          title="לחיצה סוגרת"
        >
          <img src={lightbox} alt={RENDERS.find((r) => r.src === lightbox)?.name ?? ''} className="max-h-full max-w-full shadow-2xl" />
          <span className="absolute bottom-4 right-4 bg-white px-2 py-1 text-xs">
            {RENDERS.find((r) => r.src === lightbox)?.name}. מקור: מצגת צוות התכנון. לחיצה סוגרת.
          </span>
        </button>
      )}

      {/* מה מוצג, ומה מקור הגיאומטריה */}
      <div className="pointer-events-none absolute right-3 top-3 hidden max-w-[55%] bg-white/85 px-2 py-1 text-xs text-ink/75 md:block">
        {massMode === 'design' ? (
          <>
            <span className="font-semibold">מודל התכנון.</span> הועלו מודלי אדריכל ל-{DESIGNS.length} מגרשים. לשאר מוצג קו המעטפת המותרת בלבד.
          </>
        ) : real ? (
          <>
            <span className="font-semibold">מודל הזכויות, בהדמיה ריאליסטית.</span> גובה, תכסית ונסיגת הקומות העליונות לפי התכנית. החזיתות
            גנריות, ופרקים חסרים מוצגים באפור.
          </>
        ) : development ? (
          <>
            <span className="font-semibold">{topic.nameHe} על רחובות התוכנית.</span> הרחובות אמיתיים. מיקום הרכיבים
            לאורכם סכמטי.
          </>
        ) : (
          <>
            <span className="font-semibold">מודל הזכויות.</span> כל מסה היא המעטפת המרבית שהתב"ע מתירה: מגורים, ציבור, חינוך ומסחר.
          </>
        )}
      </div>

      {/* שורת הסבר: מה אומר כל סימן */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-5 gap-y-1 bg-white/80 px-2 py-1 text-xs text-ink/75">
        {real ? (
          <span>שמש וצללים מחושבים בזמן אמת. לתמונה ריאליסטית מלאה: ההדמיות של צוות התכנון, משמאל.</span>
        ) : development ? (
          <>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-5" style={{ background: topic.layerColor }} />
              צבע מלא: מפרט שהושלם
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 outline outline-1 outline-wait" />
              קווי מתאר: פרק שממתין להשלמה
            </span>
          </>
        ) : (
          <>
            <span>גובה המסה: הגובה המרבי בטבלת הזכויות. הבסיס: אחוז התכסית.</span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-5 border-t border-dashed border-[#C0392B]" />
              קו בניין
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-1 w-5 bg-[#6B5B95]" />
              חזית מסחרית
            </span>
          </>
        )}
        <span className="hidden md:inline">גלגלת העכבר: זום אל הסמן. גרירה: סיבוב. גרירה בלחצן ימני: הזזה.</span>
        <span className="mr-auto text-[0.65rem] text-ink/50" dir="ltr">
          {real || mode === 'satellite' ? 'Imagery: Esri, Maxar, Earthstar Geographics' : mode === 'schematic' ? '© OpenStreetMap contributors' : ''}
        </span>
      </div>
    </div>
  );
}
