import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CityModel from './CityModel';
import { usePlanStore, useSelection } from '../../store/planStore';
import type { CameraView } from '../../types/plan';

const VIEWS: Record<CameraView, { pos: [number, number, number]; target: [number, number, number] }> = {
  top: { pos: [0, 58, 0.01], target: [0, 0, 0] },
  perspective: { pos: [-33, 23, 24], target: [1, 0, -1.5] },
  street: { pos: [-21.5, 1.7, 0.9], target: [8, 3, -0.5] },
};

/** מניע את המצלמה ברכות אל המבט שנבחר, ומפסיק כשהמשתמש מסובב בעצמו */
function CameraRig() {
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

  useEffect(() => {
    if (view.tick === 0) return;
    pos.set(...VIEWS[view.name].pos);
    tgt.set(...VIEWS[view.name].target);
    moving.current = true;
  }, [view, pos, tgt]);

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
    if (camera.position.distanceTo(pos) < 0.05) moving.current = false;
  });
  return null;
}

export default function Viewport3D() {
  const { topic } = useSelection();
  const selectTopic = usePlanStore((s) => s.selectTopic);

  return (
    <div className="viewport-canvas relative h-full w-full bg-sand">
      <Canvas
        camera={{ position: VIEWS.perspective.pos, fov: 42, near: 0.1, far: 400 }}
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
          target={VIEWS.perspective.target}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={4}
          maxDistance={110}
        />
        <CameraRig />
        <CityModel />
      </Canvas>

      {/* שורת הסבר: מה מוצג ומה אומר כל סימן */}
      <div className="pointer-events-none absolute bottom-4 right-4 left-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink/70">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-5" style={{ background: topic?.layerColor ?? '#C4A882' }} />
          צבע מלא: מפרט שהושלם
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-5 outline outline-1 outline-wait" />
          קווי מתאר: פרק שממתין להשלמה
        </span>
        <span className="hidden md:inline">לחיצה על חלק במודל פותחת את המפרט שלו. גרירה מסובבת, גלגלת מקרבת.</span>
      </div>
    </div>
  );
}
