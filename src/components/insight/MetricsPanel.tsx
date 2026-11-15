import { useState } from 'react';
import { METRICS, METRIC_CHAPTERS, STATE_HINT, STATE_LABEL, type MetricState } from '../../data/metrics';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import ShowBtn from '../ui/ShowBtn';
import Check from '../ui/Check';
import { MISSING_GIS } from '../../data/sources';
import { OFFICIAL, OFFICIAL_DATE, OFFICIAL_SUMMARY, OFFICIAL_URL } from '../../data/official360';

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
  const checks = usePlanStore((s) => s.checks);
  const setCheck = usePlanStore((s) => s.setCheck);
  // הניקוד המחושב: מדד שמתאים לפי הבדיקה, או שסומן ידנית כקיים
  const auto = METRICS.filter((m) => m.state === 'fit').reduce((a, m) => a + m.max, 0);
  const manual = METRICS.filter((m) => m.state !== 'fit' && checks[`m-${m.id}`]?.done).reduce((a, m) => a + m.max, 0);
  const [filter, setFilter] = useState<MetricState | 'all'>('all');
  const n = (s: MetricState) => METRICS.filter((m) => m.state === s).length;
  const points = (s: MetricState) => METRICS.filter((m) => m.state === s).reduce((a, m) => a + m.max, 0);
  // הניקוד הרשמי: רק מדדים שנמדדו נכנסים לחישוב. "לא ניתן למדוד" אינו אפס
  const measured = METRICS.filter((m) => OFFICIAL[m.id]?.s != null);
  const got = measured.reduce((a, m) => a + (OFFICIAL[m.id].s as number), 0);
  const maxMeasured = measured.reduce((a, m) => a + m.max, 0);

  return (
    <PanelShell
      name="התאמה למדדים"
      title={`מתוך 44 מדדים: ${n('fit')} מתאימים, ${n('adjust')} דורשים התאמה, ${n('add')} חסרים`}
      lead="דוח בדיקה של תוכנית הבינוי מול מדדי שכונה 360° (המועצה לבנייה ירוקה ומשרד הבינוי, גרסה 2.0). לכל מדד: מה כבר יש בתוכנית, ומה האדריכל צריך לעשות."
    >
      {/* הדוח הרשמי מאפליקציית שכונה 360 */}
      <section className="mt-4 bg-ink/[0.04] p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold">הניקוד הרשמי באפליקציית שכונה 360°</h3>
            <p className="mt-1 text-3xl font-light leading-none">
              {got} <span className="text-base text-ink/55">מתוך {maxMeasured} נקודות שנמדדו</span>
            </p>
            <p className="mt-1 text-sm text-ink/70">
              נמדדו <span className="font-semibold">{measured.length}</span> מדדים מתוך 44. <span className="font-semibold">{44 - measured.length}</span> לא ניתנים למדידה
              מהמסמכים. הסף לדרגת ארד: 55 נקודות מתוך 120.
            </p>
          </div>
          <a className="btn no-print shrink-0 gap-1 px-2 py-1 text-xs underline decoration-ink/30 underline-offset-4" href={OFFICIAL_URL} target="_blank" rel="noreferrer">
            פתיחה בשכונה 360°
          </a>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{OFFICIAL_SUMMARY}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink/50">
          המדידה: {OFFICIAL_DATE}, אוטומטית, שלב ב', מול הוראות תכנית 603-0811588 בלבד. המצגת של צוות התכנון ותכנית 3/124/03/3 לא נכללו בה. לכן הבדיקה שלמטה רחבה
          יותר: היא מוסיפה את מה שהמצגת כבר נותנת.
        </p>
      </section>

      <section className="mt-4 bg-ink/[0.04] p-3">
        <h3 className="text-sm font-semibold">הניקוד המחושב כאן</h3>
        <p className="mt-1 text-3xl font-light leading-none">
          {auto + manual} <span className="text-base text-ink/55">מתוך 120 נקודות</span>
        </p>
        <p className="mt-1 text-sm text-ink/70">
          <span className="font-semibold">{auto}</span> ממדדים שנמצאו מתאימים בבדיקה, ועוד <span className="font-semibold">{manual}</span> ממדדים שסימנת כקיימים. הסף לדרגת ארד: 55.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink/50">מדד שסומן מקבל את מלוא הניקוד שלו. זו הערכה לעבודה, ולא ניקוד רשמי. ליד כל סימון ידני כותבים הסבר.</p>
        <details className="no-print mt-2 text-sm">
          <summary className="cursor-pointer font-semibold" title="מה חסר כדי למדוד אוטומטית">
            {MISSING_GIS.length} שכבות GIS שחסרות למדידה אוטומטית
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pr-5 leading-relaxed">
            {MISSING_GIS.map((g) => (
              <li key={g.layer}>
                <span className="font-semibold">{g.layer}.</span> {g.enables}
              </li>
            ))}
          </ol>
        </details>
      </section>

      <h3 className="mt-5 text-sm font-semibold">הבדיקה המורחבת: התוכנית והמצגת יחד</h3>
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
                      {m.state !== 'fit' && <Check id={`m-${m.id}`} label="קיים בתוכנית" />}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">
                      <span className="font-semibold text-ink/80">מה יש: </span>
                      {m.has}
                    </p>
                    <p className="mt-1 text-base leading-relaxed">
                      <span className="font-semibold">הנחיה לאדריכל: </span>
              <span className="bg-[#F4E9A8] px-1">{m.todo}</span>
                    </p>
                    <p className="text-xs text-ink/45">מקור הדרישה: שכונה 360°, גרסה 2.0, מדד {m.id}.</p>
                    {checks[`m-${m.id}`]?.done && (
                      <input className="field no-print mt-1 py-1.5" placeholder="הסבר: איפה זה מופיע בתוכנית" aria-label="הסבר לסימון" value={checks[`m-${m.id}`]?.note ?? ''} onChange={(e) => setCheck(`m-${m.id}`, { note: e.target.value })} />
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">
                      <span className="font-semibold text-ink/80">ניקוד רשמי: </span>
                      {OFFICIAL[m.id].s == null ? 'לא ניתן למדוד. ' : `${OFFICIAL[m.id].s} מתוך ${m.max}. `}
                      {OFFICIAL[m.id].n}
                    </p>
                    {OFFICIAL[m.id].q && (
                      <p className="mt-1 text-xs leading-relaxed text-ink/55">
                        ראיה: "{OFFICIAL[m.id].q}" ({OFFICIAL[m.id].src})
                      </p>
                    )}
                    {m.go && <ShowBtn go={m.go!} />}
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
