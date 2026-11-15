import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { SHEETS } from '../../data/appendixGeo';
import { usePlanStore } from '../../store/planStore';

/** תשריט של נספח, פרוש על הקרקע במקומו. המודל נשאר מעליו */
export default function AppendixSheet() {
  const id = usePlanStore((s) => s.appendix);
  const sheet = SHEETS.find((s) => s.id === id);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    setTex(null);
    if (!sheet) return;
    let alive = true;
    new THREE.TextureLoader().load(sheet.img, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      if (alive) setTex(t);
      else t.dispose();
    });
    return () => {
      alive = false;
    };
  }, [sheet]);
  useEffect(() => () => tex?.dispose(), [tex]);
  if (!sheet || !tex) return null;
  return (
    <group position={[sheet.cx, 1, -sheet.cy]} rotation={[0, -sheet.angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[sheet.w, sheet.h]} />
        <meshBasicMaterial map={tex} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
