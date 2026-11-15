import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CityModel from './CityModel';
import QuarterModel from './QuarterModel';
import { sceneFor, usePlanStore, useSelection, type SceneName } from '../../store/planStore';
import type { CameraView } from '../../types/plan';

type View = { pos: [number, number, number]; target: [number, number, number] };
const VIEWS: Record<SceneName, Record<CameraView, View>> = {
  quarter: {
    top: { pos: [0, 1650, 1], target: [0, 0, 0] },
    perspective: { pos: [-190, 690, 1090], target: [0, 0, 40] },
    street: { pos: [-780, 70, 330], target: [-150, 40, -20] },
  },
  street: {
    top: { pos: [0, 58, 0.01], target: [0, 0, 0] },
    perspective: { pos: [-33, 23, 24], target: [1, 0, -1.5] },
    street: { pos: [-21.5, 1.7, 0.9], target: [8, 3, -0.5] },
  },
};
/** במסך צר הרובע רחב מהחלון, ולכן המצלמה מתרחקת */
function viewOf(scene: SceneName, name: CameraView): View {
  const v = VIEWS[scene][name];
  if (scene !== 'quarter' || name === 'street' || window.innerWidth >= 768) return v;
  return { pos: [v.pos[0] * 2, v.pos[1] * 2, v.pos[2] * 2], target: v.target };
}

const RANGE: Record<SceneName, { min: number; max: number }> = {
  quarter: { min: 60, max: 3400 },
  street: { min: 4, max: 110 },
};

/** מניע את המצלמה ברכות אל המבט שנבחר, ומפסיק כשהמשתמש מסובב בעצמו */
function CameraRig({ scene }: { scene: SceneName }) {
  const view = usePlanStore((s) => s.view);
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

  const lastScene = useRef(scene);

  useEffect(() => {
    const v = viewOf(scene, view.name);
    pos.set(...v.pos);
    tgt.set(...v.target);
    if (lastScene.current !== scene) {
      // מעבר בין הרובע לחתך הרחוב: קנה מידה אחר, ולכן המצלמה קופצת ולא גולשת
      lastScene.current = scene;
      moving.current = false;
      camera.position.copy(pos);
      if (controls) {
        controls.target.copy(tgt);
        controls.update();
      }
      return;
    }
    if (view.tick === 0) return;
    moving.current = true;
  }, [view, scene, pos, tgt, camera, controls]);

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
    if (camera.position.distanceTo(pos) < (scene === 'quarter' ? 1 : 0.05)) moving.current = false;
  });
  return null;
}

export default function Viewport3D() {
  const { topic } = useSelection();
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const viewName = usePlanStore((s) => s.view.name);
  const scene = sceneFor(topic?.id ?? null);
  const [start] = useState(() => viewOf(scene, viewName));

  return (
    <div className="viewport-canvas relative h-full w-full bg-sand">
      <Canvas
        camera={{ position: start.pos, fov: 42, near: 0.5, far: 6000 }}
        dpr={[1, 2]}
        flat
        onPointerMissed={() => selectTopic(null)}
      >
        <color attach="background" args={['#F5F0EB']} />
        <hemisphereLight args={['#FFFFFF', '#E6DED3', 1.7]} />
        <directionalLight position={[-14, 26, 16]} intensity={1.9} />
        <directionalLight position={[18, 10, -12]} intensity={0.5} />
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          target={start.target}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={RANGE[scene].min}
          maxDistance={RANGE[scene].max}
        />
        <CameraRig scene={scene} />
        {scene === 'quarter' ? <QuarterModel /> : <CityModel />}
      </Canvas>

      {/* מה מוצג, ומה מקור הגיאומטריה */}
      <div className="pointer-events-none absolute right-4 top-3 bg-white/80 px-2 py-1 text-xs text-ink/75">
        {scene === 'quarter' ? (
          <>
            <span className="font-semibold">הרובע כולו.</span> המגרשים מקובצי התכנית 603-0811588. המסות סכמטיות.
          </>
        ) : (
          <>
            <span className="font-semibold">חתך רחוב טיפוסי, להמחשה.</span> אינו גיאומטריה מהתכנית.
          </>
        )}
      </div>

      {/* שורת הסבר: מה אומר כל סימן */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink/70">
        {scene === 'quarter' ? (
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
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 bg-[#7FB36A]" />
              זיקת הנאה
            </span>
            <span className="hidden md:inline">לחיצה על מגרש פותחת את הזכויות שלו.</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-5" style={{ background: topic?.layerColor ?? '#C4A882' }} />
              צבע מלא: מפרט שהושלם
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-5 outline outline-1 outline-wait" />
              קווי מתאר: פרק שממתין להשלמה
            </span>
            <span className="hidden md:inline">לחיצה על חלק במודל פותחת את המפרט שלו. גרירה מסובבת, גלגלת מקרבת.</span>
          </>
        )}
      </div>
    </div>
  );
}
