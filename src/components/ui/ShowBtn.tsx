import type { Go } from '../../data/insights';
import { usePlanStore } from '../../store/planStore';
import { IconBtn } from './Icon';

/** כפתור העין: מדליק את הנושא או את תת-הנושא במודל, ולחיצה נוספת מכבה אותו */
export default function ShowBtn({ go, className = 'no-print mt-2' }: { go: Go; className?: string }) {
  const run = usePlanStore((s) => s.go);
  const topicId = usePlanStore((s) => s.selectedTopicId);
  const itemId = usePlanStore((s) => s.selectedItemId);
  const lot = usePlanStore((s) => s.selectedLot);
  const on = go.topic != null && topicId === go.topic && (!go.item || itemId === go.item) && (!go.lot || lot === go.lot);
  return <IconBtn icon="show" on={on} label={on ? 'כיבוי התצוגה במודל' : 'הצגה במודל'} className={className} onClick={() => run(on ? { topic: null } : go)} />;
}
