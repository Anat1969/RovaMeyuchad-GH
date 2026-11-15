import { useState } from 'react';
import { METRICS, METRIC_CHAPTERS, STATE_HINT, STATE_LABEL, type MetricState } from '../../data/metrics';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';

const ORDER: MetricState[] = ['fit', 'adjust', 'add', 'out'];
const BAR: Record<MetricState, string> = { fit: 'bg-done', adjust: 'bg-[#D9A23D]', add: 'bg-red-700/70', out: 'bg-ink/20' };
const CHIP: Record<MetricState, string> = {
  fit: 'bg-done/10 text-done',
  adjust: 'bg-[#D9A23D]/20 text-[#7A5A12]',
  add: 'bg-red-700/10 text-red-800',
  out: 'bg-ink/[0.08] text-ink/60',
};

/** דוח בדיקה מול 44 מדדי שכונה 360°: מה יש, מה להתאים, מה להוסיף, והנחיה לאדריכל בכל מדד */
export default function MetricsPanel() {
  const go = usePlanStore((s) => s.go);
  const [filter, setFilter] = useState<MetricState | 'all'>('all');
  const n = (s: MetricState) => METRICS.filter((m) => m.state === s).length;
  const points = (s: MetricState) => METRICS.filter((m) => m.state === s).reduce((a, m) => a + m.max, 0);

  return (
    <PanelShell
      name="התאמה למדדים"
      title={`מתוך 44 מדדים: ${n('fit')} מתאימים, ${n('adjust')} דורשים התאמה, ${n('add')} חסרים`}
      lead="דוח בדיקה של תוכנית הבינוי מול מדדי שכונה 360° (המועצה לבנייה ירוקה ומשרד הבינוי, גרסה 2.0). לכל מדד: מה כבר יש בתוכנית, ומה האדריכל צריך לעשות."
    >
      {/* פס הסיכום: כל מדד הוא משבצת אחת */}
      <div className="mt-4 flex h-4 gap-px" aria-hidden>
        {METRICS.map((m) => (
          <span key={m.id} title={`${m.id}. ${m.name}`} className={`flex-1 ${BAR[m.state]}`} />
        ))}
      </div>

      {/* מיני-סרגל: סינון לפי מצב. בהדפסה מודפס מה שמוצג */}
      <div className="no-print mt-3 grid grid-cols-5 gap-1" role="tablist" aria-label="סינון לפי מצב">
        <button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={`btn flex-col gap-0 px-1 py-2 ${filter === 'all' ? 'btn-on' : ''}`}>
          <span className="text-lg font-semibold leading-none">44</span>
          <span className="text-xs">הכול</span>
        </button>
        {ORDER.map((s) => (
          <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={`btn flex-col gap-0 px-1 py-2 ${filter === s ? 'btn-on' : ''}`}>
            <span className="text-lg font-semibold leading-none">{n(s)}</span>
            <span className="text-xs leading-tight">{STATE_LABEL[s]}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink/75">
        {filter === 'all' ? (
          <>
            המדדים שדורשים התאמה או הוספה שווים יחד <span className="font-semibold">{points('adjust') + points('add')}</span> נקודות מתוך{' '}
            <span className="font-semibold">120</span>. שם נמצא הפוטנציאל לשיפור.
          </>
        ) : (
          <>
            <span className="font-semibold">{STATE_LABEL[filter]}:</span> {STATE_HINT[filter]} סך הכול <span className="font-semibold">{points(filter)}</span> נקודות.
          </>
        )}
      </p>

      {METRIC_CHAPTERS.map((ch) => {
        const list = METRICS.filter((m) => m.id >= ch.from && m.id <= ch.to && (filter === 'all' || m.state === filter));
        if (!list.length) return null;
        return (
          <section key={ch.name} className="mt-6">
            <h3 className="text-lg font-semibold">
              {ch.name} <span className="text-sm font-normal text-ink/50">מדדים {ch.from} עד {ch.to}</span>
            </h3>
            <ol className="mt-2 space-y-2">
              {list.map((m) => (
                <li key={m.id} className="grid grid-cols-[2.6rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
                  <span className="text-3xl font-light leading-none text-ink/35">{m.id}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold leading-snug">{m.name}</h4>
                      <span className={`px-1.5 text-xs font-semibold ${CHIP[m.state]}`}>{STATE_LABEL[m.state]}</span>
                      <span className="text-xs text-ink/45">{m.max} נק'</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">
                      <span className="font-semibold text-ink/80">מה יש: </span>
                      {m.has}
                    </p>
                    <p className="mt-1 text-base leading-relaxed">
                      <span className="bg-[#F4E9A8] px-1 font-semibold">הנחיה לאדריכל</span> {m.todo}
                    </p>
                    {m.go && (
                      <button className="btn no-print mt-2 px-3 py-1 text-xs" onClick={() => go(m.go!)} title="מציג את הנושא במודל שמימין">
                        הצגה במודל
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <p className="mt-6 text-xs leading-relaxed text-ink/50">
        זו בדיקת התאמה מקריאה של המצגת ושל הוראות תכנית 603-0811588, ולא ניקוד רשמי. חלק מהמדדים נוגעים לתכנית 3/124/03/3 ולנספחים שלא נבדקו. לניקוד מלא
        לפי המחוון: אפליקציית שכונה 360°. המדדים והדרישות: "שכונה 360°: מדדים לתכנון ולפיתוח עירוני", גרסה 2.0, ינואר 2025.
      </p>
    </PanelShell>
  );
}
