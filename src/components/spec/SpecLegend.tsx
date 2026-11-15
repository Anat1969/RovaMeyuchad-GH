import type { SpecItem } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import ColorSwatch from '../ui/ColorSwatch';

/** המקרא הוא גם בורר: ריחוף או לחיצה על שורה מבודדים את החומר במודל */
export default function SpecLegend({ item }: { item: SpecItem }) {
  const focus = usePlanStore((s) => s.legendFocus);
  const setFocus = usePlanStore((s) => s.setLegendFocus);
  if (item.legend.length === 0) return null;

  return (
    <section className="mt-5">
      <h3 className="mb-1 text-xs font-semibold text-ink/60">מקרא</h3>
      <p className="mb-2 text-xs text-ink/45">מעבר על שורה מבודד את החומר במודל, ומציג את התמונה שלו למעלה</p>
      <ul onMouseLeave={() => setFocus(null)}>
        {item.legend.map((entry, idx) => {
          const on = focus?.itemId === item.id && focus.idx === idx;
          return (
            <li key={idx}>
              <button
                className={`flex w-full items-center gap-3 px-2 py-2 text-right ${on ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.04]'}`}
                onMouseEnter={() => setFocus({ itemId: item.id, idx })}
                onFocus={() => setFocus({ itemId: item.id, idx })}
                onClick={() => setFocus(on ? null : { itemId: item.id, idx })}
              >
                <ColorSwatch color={entry.color} />
                {entry.image && <img src={entry.image} alt="" className="h-10 w-14 shrink-0 object-cover" loading="lazy" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{entry.label}</span>
                  {entry.latinName && entry.latinName !== entry.label && (
                    <span className="block text-xs italic text-ink/45" dir="ltr" style={{ textAlign: 'right' }}>
                      {entry.latinName}
                    </span>
                  )}
                </span>
                {entry.code && <span className="text-xs text-ink/45">מק"ט {entry.code}</span>}
                <span className="text-[0.65rem] text-ink/35" dir="ltr">
                  {entry.color.toUpperCase()}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
