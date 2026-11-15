import { useMemo } from 'react';
import * as THREE from 'three';
import { REF, tY } from '../../analysis/terrain';
import { FUNNEL_TOTAL, HELI, allowedLevel, halfWidth } from '../../data/heliData';
import { usePlanStore } from '../../store/planStore';

/** משפך הגישה של מנחת המסוקים כמשטח בגובהו האמיתי. בניין שחודר אותו בולט מעליו */
export default function FunnelVolume() {
  const on = usePlanStore((s) => s.appendix) === 'heli';
  const geo = useMemo(() => {
    const pos: number[] = [];
    const idx: number[] = [];
    const [ax, ay] = HELI.axis;
    const [nx, ny] = [-ay, ax];
    for (const dir of [1, -1]) {
      const base = pos.length / 3;
      const steps = Math.ceil(FUNNEL_TOTAL / 25);
      for (let k = 0; k <= steps; k++) {
        const s = Math.min(FUNNEL_TOTAL, k * 25);
        const hw = halfWidth(s);
        for (const side of [-1, 1]) {
          const x = HELI.pad[0] + ax * dir * (HELI.half + s) + nx * side * hw;
          const y = HELI.pad[1] + ay * dir * (HELI.half + s) + ny * side * hw;
          // המפלס המוחלט של המשפך, באותו בסיס גובה של הטופוגרפיה
          pos.push(x, allowedLevel(s) - REF, -y);
        }
        if (k) idx.push(base + 2 * k - 2, base + 2 * k - 1, base + 2 * k, base + 2 * k - 1, base + 2 * k + 1, base + 2 * k);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 1), [geo]);
  if (!on) return null;
  return (
    <group renderOrder={6}>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#C0392B" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#8E2A1F" transparent opacity={0.5} />
      </lineSegments>
      <mesh position={[HELI.pad[0], 1.5 + tY(HELI.pad[0], HELI.pad[1]), -HELI.pad[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9, 12, 32]} />
        <meshBasicMaterial color="#8E2A1F" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
