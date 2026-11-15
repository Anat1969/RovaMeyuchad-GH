import { APPENDICES } from '../../data/appendices';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import { IconBtn } from '../ui/Icon';

/** נספחי התב"ע: מה כל נספח קובע, על מה לשים לב, ופריסה שלו על המודל */
export default function AppendixPanel() {
  const active = usePlanStore((s) => s.appendix);
  const setAppendix = usePlanStore((s) => s.setAppendix);
  const setView = usePlanStore((s) => s.setView);
  const go = usePlanStore((s) => s.go);
  const withSheet = APPENDICES.filter((a) => a.sheet).length;

  return (
    <PanelShell
      name='נספחי התב"ע'
      title={`${APPENDICES.length} מסמכים, ${withSheet} מהם נפרשים על המודל`}
      lead="לכל נספח: מה הוא קובע, על מה לשים לב בתכנון, והמסמך המקורי. תשריט נפרש על הקרקע במקומו, והמודל התלת-ממדי נשאר מעליו."
    >
      <ol className="mt-4 space-y-2">
        {APPENDICES.map((a, i) => {
          const on = active === a.sheet && !!a.sheet;
          return (
            <li key={a.id} className={`grid grid-cols-[2.2rem_1fr] gap-x-2 p-3 ${on ? 'bg-[#F4E9A8]/50' : 'bg-ink/[0.03]'}`}>
              <span className="text-3xl font-light leading-none text-ink/35">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-snug">
                  {a.name} <span className="text-xs font-normal text-ink/50">{a.plan}</span>
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/75">{a.what}</p>
                <div className="no-print mt-2 flex flex-wrap items-center gap-1">
                  {a.sheet && (
                    <button
                      title={on ? 'הסרת התשריט מהמודל' : 'פריסת התשריט על המודל'}
                      aria-pressed={on}
                      onClick={() => setAppendix(on ? null : a.sheet!)}
                      className={`btn px-3 py-1.5 text-xs ${on ? 'btn-on' : ''}`}
                    >
                      {on ? 'מוצג על המודל' : 'הצגה על המודל'}
                    </button>
                  )}
                  {a.sheet && on && <IconBtn icon="top" label="מבט על" onClick={() => setView('top')} />}
                  {a.go && <IconBtn icon="show" label="הצגת הנושא במודל" onClick={() => go(a.go!)} />}
                  {a.docs.map((d) => (
                    <a key={d.url} href={d.url} target="_blank" rel="noreferrer" title="פתיחת המסמך" className="btn px-2 py-1.5 text-xs underline decoration-ink/30 underline-offset-4">
                      {d.name}
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-ink/60">מה הנספח קובע</p>
                <ul className="mt-1 list-disc space-y-1 pr-5 text-sm leading-relaxed">
                  {a.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-semibold">
                  <span className="bg-[#F4E9A8] px-1">על מה לשים לב בתכנון</span>
                </p>
                <ul className="mt-1 list-disc space-y-1 pr-5 text-sm leading-relaxed">
                  {a.watch.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {a.accuracy && <p className="mt-2 text-xs text-ink/50">{a.accuracy}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 text-xs leading-relaxed text-ink/50">
        הנתונים נקראו בעין מגיליונות סרוקים, ולכן כדאי לאמת מספרים מול המסמך המקורי לפני שימוש רשמי. עוד לא הועלה: נספח עצים בוגרים.
      </p>
    </PanelShell>
  );
}
