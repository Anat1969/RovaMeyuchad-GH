import { useEffect, useMemo, useState } from 'react';
import { drapedPlane } from '../../analysis/terrain';
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
  // התשריט מונח על הטופוגרפיה, במקומו ובזווית שלו
  const geo = useMemo(() => (sheet ? drapedPlane(sheet.cx, sheet.cy, sheet.w, sheet.h, sheet.angle, 1) : null), [sheet]);
  if (!sheet || !tex) return null;
  return (
    <mesh geometry={geo!} renderOrder={3}>
      <meshBasicMaterial map={tex} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
