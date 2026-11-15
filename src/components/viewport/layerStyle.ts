import type { PlanTopic } from '../../types/plan';
import type { LegendFocus } from '../../store/planStore';

/** חלק במודל: משויך לנושא, לפריט ולשורה במקרא, ולכן הצבע שלו נגזר תמיד מנתוני התוכנית */
export interface PieceRef {
  layer: string;
  item: string;
  idx?: number;
  fixed?: string; // צבע קבוע (גזע)
}

export interface PieceStyle {
  color: string;
  opacity: number;
  ghost: boolean; // פרק שממתין להשלמה: קווי מתאר בלבד
}

const DIM = '#CFCAC2';

export function resolveStyle(
  piece: PieceRef,
  topics: PlanTopic[],
  activeTopicId: string | null,
  activeItemId: string | null,
  focus: LegendFocus | null,
): PieceStyle {
  const topic = topics.find((t) => t.id === piece.layer);
  const item = topic?.items.find((i) => i.id === piece.item);
  const layerColor = topic?.layerColor ?? '#77736C';
  const entry = item?.legend[piece.idx ?? 0] ?? item?.legend[0];
  const ghost = !item || item.status === 'pending' || !entry;
  const natural = piece.fixed ?? entry?.color ?? layerColor;

  // בלי נושא, או בנושא הבינוי: הכול בצבעו הטבעי, והחסר בקווי מתאר
  if (!activeTopicId || activeTopicId === 'massing') {
    return { color: ghost ? layerColor : natural, opacity: ghost ? 0.5 : 1, ghost };
  }
  if (activeTopicId !== piece.layer) {
    return { color: DIM, opacity: ghost ? 0.08 : 0.3, ghost };
  }
  if (ghost) return { color: layerColor, opacity: 1, ghost };
  let opacity = 1;
  if (focus) opacity = focus.itemId === piece.item && focus.idx === (piece.idx ?? -1) ? 1 : 0.12;
  else if (activeItemId && piece.item !== activeItemId) opacity = 0.4;
  return { color: natural, opacity, ghost };
}
