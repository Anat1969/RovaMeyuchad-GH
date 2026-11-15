import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { SCENE_PIECES, type Piece } from '../../data/sceneData';
import { usePlanStore } from '../../store/planStore';
import { resolveStyle } from './layerStyle';

const GEO: Record<Piece['shape'], THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cone: new THREE.ConeGeometry(1, 1, 18),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};

function PieceMesh({ piece }: { piece: Piece }) {
  const topics = usePlanStore((s) => s.topics);
  const topicId = usePlanStore((s) => s.selectedTopicId);
  const itemId = usePlanStore((s) => s.selectedItemId);
  const focus = usePlanStore((s) => s.legendFocus);
  const selectTopic = usePlanStore((s) => s.selectTopic);

  const style = resolveStyle(piece, topics, topicId, itemId, focus);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Color(), []);
  target.set(style.color);

  // מעבר רך בין שכבות
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const k = Math.min(1, dt * 7);
    m.color.lerp(target, k);
    m.opacity += (style.opacity - m.opacity) * k;
    m.depthWrite = m.opacity > 0.85;
  });

  return (
    <mesh
      geometry={GEO[piece.shape]}
      position={piece.pos}
      scale={piece.size}
      onClick={
        style.clickable
          ? (e) => {
              e.stopPropagation();
              selectTopic(piece.layer, piece.item);
            }
          : undefined
      }
      onPointerOver={style.clickable ? () => (document.body.style.cursor = 'pointer') : undefined}
      onPointerOut={style.clickable ? () => (document.body.style.cursor = '') : undefined}
    >
      <meshStandardMaterial ref={mat} transparent roughness={0.92} metalness={0} color={style.color} opacity={style.opacity} />
      {(style.ghost || piece.layer === 'context') && (
        <Edges threshold={20} color={style.edge} lineWidth={style.ghost && topicId === piece.layer ? 2 : 1} />
      )}
    </mesh>
  );
}

export default function CityModel() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[64, 52]} />
        <meshStandardMaterial color="#EFE9E1" roughness={1} />
      </mesh>
      {SCENE_PIECES.map((p) => (
        <PieceMesh key={p.id} piece={p} />
      ))}
    </group>
  );
}
