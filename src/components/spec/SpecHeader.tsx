import type { PlanTopic, SpecItem } from '../../types/plan';
import Badge from '../ui/Badge';
import { usePlanStore } from '../../store/planStore';

/** בלי תמונה: גרפיקה שנבנית מצבעי המקרא. פרק חסר: קווקוו */
export function SpecImage({ item, topic }: { item: SpecItem; topic: PlanTopic }) {
  const focus = usePlanStore((s) => s.legendFocus);
  // שורת מקרא שנבחרה מחליפה את התמונה לתמונה של אותו מין או חומר
  const entry = focus?.itemId === item.id ? item.legend[focus.idx] : undefined;
  const src = entry?.image ?? item.image;
  const credit = entry?.image ? entry.credit : item.imageCredit;
  const caption = entry?.image ? entry.label : item.legend.find((e) => e.image === item.image)?.label;

  if (src) {
    return (
      <figure className="relative h-56 w-full overflow-hidden bg-ink/[0.04]">
        <img key={src} src={src} alt={caption ?? item.nameHe} className="fade-in h-full w-full object-cover" />
        {(caption || credit) && (
          <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-white">
            <span className="text-sm font-semibold">{caption}</span>
            {credit && (
              <span className="text-left text-[0.6rem] leading-tight text-white/75" dir="ltr">
                {credit}
              </span>
            )}
          </figcaption>
        )}
      </figure>
    );
  }
  if (item.legend.length === 0) {
    return (
      <div className="hatch flex h-56 w-full items-end p-3" style={{ boxShadow: `inset 0 0 0 1px ${topic.layerColor}` }}>
        <span className="bg-white px-2 py-1 text-xs text-wait">אין עדיין מפרט להצגה</span>
      </div>
    );
  }
  return (
    <div className="flex h-56 w-full" aria-hidden>
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
