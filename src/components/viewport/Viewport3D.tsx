import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import QuarterModel from './QuarterModel';
import PlanLayers from './PlanLayers';
import ContextLayer from './ContextLayer';
import { CONTEXT } from '../../data/contextData';
import { usePlanStore, useSelection } from '../../store/planStore';
import type { CameraView, ContextMode } from '../../types/plan';

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

const MODES: { id: ContextMode; label: string }[] = [
  { id: 'schematic', label: 'סכמת רחובות' },
  { id: 'satellite', label: 'לוויין' },
  { id: 'none', label: 'ללא רקע' },
];

export default function Viewport3D() {
  const { topic } = useSelection();
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const mode = usePlanStore((s) => s.contextMode);
  const setMode = usePlanStore((s) => s.setContextMode);
  const zoomBy = usePlanStore((s) => s.zoomBy);
  const [start] = useState(() => viewOf(usePlanStore.getState().view.name));
  const development = topic !== null && topic.id !== 'massing';

  return (
    <div className="viewport-canvas relative h-full w-full bg-sand">
      <Canvas
        camera={{ position: start.pos, fov: 42, near: 1, far: 60000 }}
        dpr={[1, 2]}
        flat
        onPointerMissed={() => selectTopic(null)}
      >
        <color attach="background" args={['#F5F0EB']} />
        <hemisphereLight args={['#FFFFFF', '#E6DED3', 1.7]} />
        <directionalLight position={[-140, 260, 160]} intensity={1.9} />
        <directionalLight position={[180, 100, -120]} intensity={0.5} />
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
        <PlanLayers />
      </Canvas>

      {/* רקע הקונטקסט, וזום */}
      <div className="absolute left-3 top-3 flex flex-col items-end gap-1">
        <div className="flex gap-1 bg-white/85 p-1 shadow-sm" role="group" aria-label="רקע המפה">
          {MODES.map((m) => (
            <button
              key={m.id}
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`btn w-24 px-2 py-1 text-xs ${mode === m.id ? 'btn-on' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/85 p-1 shadow-sm" role="group" aria-label="זום">
          <button className="btn w-24 px-2 py-1 text-xs" onClick={() => zoomBy(1)}>
            התקרבות
          </button>
          <button className="btn w-24 px-2 py-1 text-xs" onClick={() => zoomBy(-1)}>
            התרחקות
          </button>
        </div>
      </div>

      {/* מה מוצג, ומה מקור הגיאומטריה */}
      <div className="pointer-events-none absolute right-3 top-3 max-w-[55%] bg-white/85 px-2 py-1 text-xs text-ink/75">
        {development ? (
          <>
            <span className="font-semibold">{topic.nameHe} על רחובות התוכנית.</span> הרחובות אמיתיים. מיקום הרכיבים
            לאורכם סכמטי.
          </>
        ) : (
          <>
            <span className="font-semibold">הרובע בתוך העיר.</span> המגרשים מקובצי התכנית 603-0811588. המסות סכמטיות.
          </>
        )}
      </div>

      {/* שורת הסבר: מה אומר כל סימן */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-5 gap-y-1 bg-white/80 px-2 py-1 text-xs text-ink/75">
        {development ? (
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
          {mode === 'satellite' ? 'Imagery: Esri, Maxar, Earthstar Geographics' : mode === 'schematic' ? '© OpenStreetMap contributors' : ''}
        </span>
      </div>
    </div>
  );
}
