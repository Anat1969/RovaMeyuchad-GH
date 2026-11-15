import type { PlanTopic, SpecItem } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import Badge from '../ui/Badge';

/** חלופות התכנון של פריט: כרטיסיות, השקף מהמצגת, ועיקרי החלופה שנבחרה */
export default function SpecAlternatives({ item, topic }: { item: SpecItem; topic: PlanTopic }) {
  const selectAlternative = usePlanStore((s) => s.selectAlternative);
  const alts = item.alternatives ?? [];
  const alt = alts.find((a) => a.id === item.selectedAlternativeId) ?? alts[0];
  if (!alt) return null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-light leading-snug">{item.nameHe}</h2>
        <Badge status={item.status} />
      </div>
      {item.description && <p className="mt-1 text-sm leading-relaxed text-ink/75">{item.description}</p>}

      <p className="mb-1 mt-4 text-xs font-semibold text-ink/60">בחרי חלופה. המודל נצבע לפי הבחירה</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${alts.length}, 1fr)` }} role="tablist">
        {alts.map((a) => {
          const on = a.id === alt.id;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={on}
              onClick={() => selectAlternative(topic.id, item.id, a.id)}
              className={`btn flex-col items-stretch gap-1 px-2 py-2 text-right ${on ? 'btn-on' : ''}`}
            >
              <span className="flex items-center justify-between text-xs font-semibold">
                {a.label}
                {a.recommended && <span className="bg-[#C9A227] px-1 text-[0.6rem] text-white">המלצת האדריכל</span>}
              </span>
              <span className="flex h-2 w-full">
                {a.colorZones.map((z) => (
                  <span key={z.zoneId} className="h-full flex-1" style={{ background: z.color }} />
                ))}
              </span>
              <span className={`text-[0.65rem] ${on ? 'text-white/80' : 'text-ink/60'}`}>{a.cost}</span>
            </button>
          );
        })}
      </div>

      <div key={alt.id} className="fade-in">
        <a href={alt.image} target="_blank" rel="noreferrer" title="פתיחת השקף המלא בלשונית חדשה" className="mt-3 block bg-ink/[0.04]">
          <img src={alt.image} alt={`${alt.label}: ${alt.title}`} className="block w-full" />
        </a>
        <p className="mt-1 text-[0.65rem] text-ink/45">השקף מתוך מצגת צוות התכנון. לחיצה מגדילה.</p>

        <h3 className="mt-3 text-lg font-semibold leading-snug">
          {alt.label}: <span className="font-light">{alt.title}</span>
        </h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {alt.cost && (
            <>
              <dt className="text-ink/60">עלות</dt>
              <dd className="flex items-center gap-2 font-semibold">
                {alt.cost}
                {alt.costLevel && (
                  <span className="flex gap-0.5" title={`דרגת עלות ${alt.costLevel} מתוך 3`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`h-2 w-3 ${n <= alt.costLevel! ? 'bg-ink' : 'bg-ink/15'}`} />
                    ))}
                  </span>
                )}
              </dd>
            </>
          )}
          {alt.streets && (
            <>
              <dt className="text-ink/60">מיועדת ל</dt>
              <dd className="font-semibold">{alt.streets}</dd>
            </>
          )}
          <dt className="text-ink/60">חומר</dt>
          <dd className="leading-relaxed">{alt.description}</dd>
        </dl>
        {alt.note && <p className="mt-2 bg-wait/[0.08] p-2 text-xs leading-relaxed text-ink/80">{alt.note}</p>}
      </div>
      {item.specRef && <p className="mt-2 text-xs text-ink/45">מקור: {item.specRef}</p>}
    </div>
  );
}
