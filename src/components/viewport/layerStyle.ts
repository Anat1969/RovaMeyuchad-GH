import type { PlanTopic } from '../../types/plan';
import type { Piece } from '../../data/sceneData';
import type { LegendFocus } from '../../store/planStore';

export interface PieceStyle {
  color: string;
  opacity: number;
  ghost: boolean; // פרק שממתין להשלמה: קווי מתאר בלבד
  edge: string;
  clickable: boolean;
}

const DIM = '#DCD7CF';

/** הצבע והמצב של כל חלק במודל נגזרים מנתוני התוכנית ומהבחירה הנוכחית */
export function resolveStyle(
  piece: Piece,
  topics: PlanTopic[],
  activeTopicId: string | null,
  activeItemId: string | null,
  focus: LegendFocus | null,
): PieceStyle {
  if (piece.layer === 'context') {
    return { color: '#FFFFFF', opacity: 1, ghost: false, edge: '#CFC9C0', clickable: false };
  }
  const topic = topics.find((t) => t.id === piece.layer);
  const item = topic?.items.find((i) => i.id === piece.item);
  const layerColor = topic?.layerColor ?? '#77736C';
  const entry = item?.legend[piece.idx ?? 0] ?? item?.legend[0];
  const ghost = !item || item.status === 'pending' || !entry;
  const natural = piece.fixed ?? entry?.color ?? layerColor;
  const isActive = activeTopicId === piece.layer;

  if (!activeTopicId) {
    return { color: ghost ? layerColor : natural, opacity: ghost ? 0.1 : 1, ghost, edge: layerColor, clickable: true };
  }
  if (!isActive) {
    return { color: DIM, opacity: ghost ? 0.03 : 0.32, ghost, edge: '#C9C3BA', clickable: true };
  }
  if (ghost) {
    return { color: layerColor, opacity: 0.28, ghost, edge: layerColor, clickable: true };
  }
  let opacity = 1;
  if (focus) {
    const hit = focus.itemId === piece.item && focus.idx === (piece.idx ?? -1);
    opacity = hit ? 1 : 0.14;
  } else if (activeItemId && piece.item !== activeItemId) {
    opacity = 0.4;
  }
  return { color: natural, opacity, ghost, edge: layerColor, clickable: true };
}
