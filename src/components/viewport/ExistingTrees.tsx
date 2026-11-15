import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { tY } from '../../analysis/terrain';
import { EXISTING_TREES, type TreeKind } from '../../data/existingTrees';
import { usePlanStore } from '../../store/planStore';

export const TREE_COLOR: Record<TreeKind, string> = { keep: '#1F6B3A', move: '#D98A1E', cut: '#8C8C88' };
export const TREE_NAME: Record<TreeKind, string> = { keep: 'לשימור', move: 'להעתקה', cut: 'לכריתה' };

function Group({ kind, strong }: { kind: TreeKind; strong: boolean }) {
  const crown = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const pts = useMemo(() => EXISTING_TREES.filter((t) => t[2] === kind), [kind]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    pts.forEach(([x, y], i) => {
      const g = tY(x, y);
      // עץ בוגר: גזע של 4 מ' ונוף ברדיוס של כ-3.5 מ', בגודל מעט שונה לכל עץ
      const k = 0.85 + ((i * 37) % 30) / 100;
      crown.current!.setMatrixAt(i, m.makeScale(k, k * 0.85, k).setPosition(x, g + 6.2, -y));
      trunk.current!.setMatrixAt(i, m.makeScale(1, 1, 1).setPosition(x, g + 2, -y));
    });
    crown.current!.instanceMatrix.needsUpdate = true;
    trunk.current!.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, pts.length]} castShadow>
        <cylinderGeometry args={[0.28, 0.36, 4, 6]} />
        <meshStandardMaterial color="#6B5640" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, pts.length]} castShadow renderOrder={5}>
        <icosahedronGeometry args={[3.6, 1]} />
        <meshStandardMaterial color={TREE_COLOR[kind]} roughness={0.9} transparent={!strong || kind === 'cut'} opacity={kind === 'cut' ? 0.5 : strong ? 1 : 0.8} />
      </instancedMesh>
    </group>
  );
}

/**
 * העצים הקיימים, מנספח העצים הבוגרים של 3/124/03/3.
 * העצים לשימור נשארים על המודל תמיד. העצים להעתקה ולכריתה מוצגים בנושא הנטיעות ועל נספחי העצים והנוף.
 */
export default function ExistingTrees() {
  const topic = usePlanStore((s) => s.selectedTopicId);
  const appendix = usePlanStore((s) => s.appendix);
  const analysis = usePlanStore((s) => s.analysis);
  if (analysis) return null;
  const all = appendix ? appendix === 'trees' || appendix === 'land' : topic === 'planting';
  return (
    <group>
      <Group kind="keep" strong={all} />
      {all && <Group kind="move" strong />}
      {all && <Group kind="cut" strong />}
    </group>
  );
}
