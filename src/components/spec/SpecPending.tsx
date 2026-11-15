import type { PlanTopic, SpecItem } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import { SpecImage } from './SpecHeader';
import Badge from '../ui/Badge';

export default function SpecPending({ item, topic }: { item: SpecItem; topic: PlanTopic }) {
  const toggleEditMode = usePlanStore((s) => s.toggleEditMode);
  return (
    <div>
      <SpecImage item={item} topic={topic} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <h2 className="text-xl font-light leading-snug">{item.nameHe}</h2>
        <Badge status="pending" />
      </div>
      <div className="mt-4 bg-wait/[0.08] p-4">
        <p className="font-semibold text-wait">ממתין להשלמה</p>
        {item.note && <p className="mt-1 text-sm leading-relaxed text-ink/80">{item.note}</p>}
        {item.specRef && <p className="mt-2 text-xs text-ink/50">מקור בתוכנית: {item.specRef}</p>}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink/55">
        במודל הפרק מסומן בקווי מתאר בלבד. כשהמפרט יושלם, החלקים יתמלאו בצבעי המקרא.
      </p>
      <button className="btn btn-on mt-4 w-full" onClick={() => toggleEditMode(true)}>
        השלימי פרק זה
      </button>
    </div>
  );
}
