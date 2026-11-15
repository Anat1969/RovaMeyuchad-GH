import { APPENDICES, DOC_ORDER, LAYER_STEPS } from '../../data/appendices';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import { IconBtn } from '../ui/Icon';
import AppendixCheck from './AppendixCheck';

/** נספחי התב"ע: מה כל נספח קובע, על מה לשים לב, ופריסה שלו על המודל */
export default function AppendixPanel() {
  const active = usePlanStore((s) => s.appendix);
  const setAppendix = usePlanStore((s) => s.setAppendix);
  const setView = usePlanStore((s) => s.setView);
  const go = usePlanStore((s) => s.go);
  const withSheet = APPENDICES.filter((a) => a.sheet).length;
  const topicId = usePlanStore((s) => s.selectedTopicId);
  const docs = [...APPENDICES].sort((a, b) => DOC_ORDER.indexOf(a.id) - DOC_ORDER.indexOf(b.id));
  // השכבה הפעילה: תשריט שפרוש, או שכבת מודל שנבחרה
  const stepOn = LAYER_STEPS.findIndex((l) => (active ? l.sheet === active : !!l.topic && l.topic === topicId));
  const pick = (i: number) => {
    const l = LAYER_STEPS[i];
    go({ topic: l?.topic ?? null });
    setAppendix(l?.sheet ?? null);
  };

  return (
    <PanelShell
      name='שכבות התב"ע'
      title={`${APPENDICES.length} מסמכים, ${withSheet} מהם נפרשים על המודל`}
      lead="לכל נספח: מה הוא קובע, על מה לשים לב בתכנון, והמסמך המקורי. תשריט נפרש על הקרקע במקומו, והמודל התלת-ממדי נשאר מעליו."
    >
      <section className="no-print mt-4 bg-ink/[0.03] p-3">
        <h3 className="text-sm font-semibold">בניית המודל, שכבה שכבה</h3>
        <ol className="mt-2 grid grid-cols-3 gap-1">
          {LAYER_STEPS.map((l, i) => (
            <li key={l.name}>
              <button title={l.what} aria-pressed={i === stepOn} onClick={() => pick(i === stepOn ? -1 : i)} className={`btn flex w-full items-center gap-1 px-1.5 py-1.5 text-xs ${i === stepOn ? 'btn-on' : ''}`}>
                <span className="opacity-50">{i + 1}</span>
                <span className="truncate">{l.name}</span>
              </button>
            </li>
          ))}
        </ol>
        {stepOn >= 0 ? (
          <div className="mt-2 flex items-start gap-2">
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <span className="font-semibold">{LAYER_STEPS[stepOn].name}.</span> {LAYER_STEPS[stepOn].what}
              <span className="block text-xs text-ink/50">מקור: {LAYER_STEPS[stepOn].src}.</span>
            </div>
            <IconBtn icon="prev" label="השכבה הקודמת" disabled={stepOn === 0} onClick={() => pick(stepOn - 1)} />
            <IconBtn icon="next" label="השכבה הבאה" disabled={stepOn === LAYER_STEPS.length - 1} onClick={() => pick(stepOn + 1)} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink/60">בוחרים שכבה, והיא מוצגת על המודל עם המקור שלה. החצים עוברים לשכבה הבאה.</p>
        )}
      </section>

      <h3 className="mt-5 text-lg font-semibold">המסמכים</h3>
      <ol className="mt-2 space-y-2">
        {docs.map((a, i) => {
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
                <AppendixCheck id={a.id} />
                {a.accuracy && <p className="mt-2 text-xs text-ink/50">{a.accuracy}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 text-xs leading-relaxed text-ink/50">
        הנתונים נקראו בעין מגיליונות סרוקים, ולכן כדאי לאמת מספרים מול המסמך המקורי לפני שימוש רשמי.
      </p>
    </PanelShell>
  );
}
