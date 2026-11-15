import type { PlanTopic, SpecItem } from '../../types/plan';
import Badge from '../ui/Badge';

/** בלי תמונה: גרפיקה שנבנית מצבעי המקרא. פרק חסר: קווקוו */
export function SpecImage({ item, topic }: { item: SpecItem; topic: PlanTopic }) {
  if (item.image) {
    return (
      <div className="flex h-40 w-full items-center justify-center bg-ink/[0.04]">
        <img src={item.image} alt={item.nameHe} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }
  if (item.legend.length === 0) {
    return (
      <div className="hatch flex h-40 w-full items-end p-3" style={{ boxShadow: `inset 0 0 0 1px ${topic.layerColor}` }}>
        <span className="bg-white px-2 py-1 text-xs text-wait">אין עדיין מפרט להצגה</span>
      </div>
    );
  }
  return (
    <div className="flex h-40 w-full" aria-hidden>
      {item.legend.map((e, i) => (
        <div key={i} className="h-full" style={{ background: e.color, flex: i === 0 ? 1.618 : 1 }} />
      ))}
    </div>
  );
}

export default function SpecHeader({ item, topic }: { item: SpecItem; topic: PlanTopic }) {
  return (
    <div>
      <SpecImage item={item} topic={topic} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <h2 className="text-xl font-light leading-snug">{item.nameHe}</h2>
        <Badge status={item.status} />
      </div>
      {item.description && <p className="mt-2 text-sm leading-relaxed text-ink/75">{item.description}</p>}
      {item.specRef && <p className="mt-2 text-xs text-ink/45">מקור בתוכנית: {item.specRef}</p>}
    </div>
  );
}
