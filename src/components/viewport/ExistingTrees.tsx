import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EXISTING_TREES, type TreeKind } from '../../data/existingTrees';
import { usePlanStore } from '../../store/planStore';

export const TREE_COLOR: Record<TreeKind, string> = { keep: '#1F6B3A', move: '#D98A1E', cut: '#8C8C88' };
export const TREE_NAME: Record<TreeKind, string> = { keep: 'לשימור', move: 'להעתקה', cut: 'לכריתה' };

function Group({ kind }: { kind: TreeKind }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pts = useMemo(() => EXISTING_TREES.filter((t) => t[2] === kind), [kind]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    pts.forEach(([x, y], i) => {
      m.makeTranslation(x, 5, -y);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pts.length]} renderOrder={5}>
      <sphereGeometry args={[3.2, 10, 8]} />
      <meshStandardMaterial color={TREE_COLOR[kind]} roughness={0.9} transparent opacity={kind === 'cut' ? 0.55 : 0.92} />
    </instancedMesh>
  );
}

/** העצים הקיימים מנספח העצים הבוגרים. מוצגים בנושא הנטיעות, ועל נספחי העצים, הנוף והבינוי */
export default function ExistingTrees() {
  const topic = usePlanStore((s) => s.selectedTopicId);
  const appendix = usePlanStore((s) => s.appendix);
  const analysis = usePlanStore((s) => s.analysis);
  const show = !analysis && (appendix ? appendix === 'trees' || appendix === 'land' : topic === 'planting');
  if (!show) return null;
  return (
    <group>
      <Group kind="keep" />
      <Group kind="move" />
      <Group kind="cut" />
    </group>
  );
}
