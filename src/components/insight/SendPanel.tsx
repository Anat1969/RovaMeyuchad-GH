import { useState } from 'react';
import { APPENDICES } from '../../data/appendices';
import { DIFFERENCES, VERDICT } from '../../data/differences';
import { DECK_URL } from '../../data/insights';
import { usePlanStore } from '../../store/planStore';
import { STATUS_LABEL } from '../ui/Badge';
import PanelShell from './PanelShell';

const DOCS = [{ name: 'מצגת שפת רחוב ושצ"פ', url: DECK_URL, group: 'תוכנית הבינוי' }, ...APPENDICES.flatMap((a) => a.docs.map((d) => ({ name: `${a.name}: ${d.name}`, url: d.url, group: 'נספחי התב"ע' })))];
const abs = (u: string) => (u.startsWith('http') ? u : `${window.location.origin}${u}`);

/** מכתב הערות לאדריכל: הערות פתוחות, פרקים חסרים, משימות, והמסמכים להורדה ולצירוף */
export default function SendPanel() {
  const topics = usePlanStore((s) => s.topics);
  const tasks = usePlanStore((s) => s.tasks);
  const [picked, setPicked] = useState<string[]>([]);
  const notes = DIFFERENCES.filter((d) => d.verdict !== 'ok');
  const missing = topics.filter((t) => t.status !== 'complete');
  const open = tasks.filter((t) => !t.done);
  const toggle = (u: string) => setPicked((p) => (p.includes(u) ? p.filter((x) => x !== u) : [...p, u]));

  return (
    <PanelShell
      name="שליחה לאדריכל"
      title={`${notes.length} הערות, ${missing.length} פרקים פתוחים ו-${open.length} משימות`}
      lead="הדף הזה הוא המכתב. כפתור המייל שלמעלה פותח הודעה עם הטקסט, וההדפסה שומרת אותו כ-PDF. קובץ אי אפשר לצרף אוטומטית למייל: מסמנים מסמכים, והקישורים אליהם נכנסים למכתב. אפשר גם להוריד ולצרף ידנית."
    >
      <section className="mt-5">
        <h3 className="text-lg font-semibold">1. הערות לתיקון ולהתייחסות</h3>
        <ol className="mt-2 list-decimal space-y-2 pr-5 text-sm leading-relaxed">
          {notes.map((d) => (
            <li key={d.topic}>
              <span className="font-semibold">{d.topic}</span> ({VERDICT[d.verdict].name}). {d.todo}
              <span className="block text-xs text-ink/50">
                התב"ע: {d.statutory} מקור: {d.statSrc}.
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5">
        <h3 className="text-lg font-semibold">2. פרקים שעוד לא הושלמו</h3>
        <ol className="mt-2 list-decimal space-y-1 pr-5 text-sm leading-relaxed">
          {missing.map((t) => (
            <li key={t.id}>
              <span className="font-semibold">{t.nameHe}</span>: {STATUS_LABEL[t.status]}. {t.items.find((i) => i.note)?.note ?? ''}
            </li>
          ))}
        </ol>
      </section>
      {open.length > 0 && (
        <section className="mt-5">
          <h3 className="text-lg font-semibold">3. משימות פתוחות</h3>
          <ol className="mt-2 list-decimal space-y-1 pr-5 text-sm leading-relaxed">
            {open.map((t) => (
              <li key={t.id}>
                {t.text}
                {t.date ? `, עד ${t.date.split('-').reverse().join('.')}` : ''}.
              </li>
            ))}
          </ol>
        </section>
      )}
      {picked.length > 0 && (
        <section className="mt-5">
          <h3 className="text-lg font-semibold">מסמכים מצורפים</h3>
          <ol className="mt-2 list-decimal space-y-1 pr-5 text-sm leading-relaxed">
            {DOCS.filter((d) => picked.includes(d.url)).map((d) => (
              <li key={d.url}>
                {d.name}: <span dir="ltr">{abs(d.url)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="no-print mt-6">
        <h3 className="text-sm font-semibold">בחירת מסמכים לצירוף</h3>
        <ul className="mt-2 space-y-1">
          {DOCS.map((d) => (
            <li key={d.url} className="flex items-center gap-2 text-sm">
              <input type="checkbox" id={d.url} checked={picked.includes(d.url)} onChange={() => toggle(d.url)} className="h-4 w-4 accent-[#2E2E2B]" />
              <label htmlFor={d.url} className="min-w-0 flex-1 truncate">
                {d.name} <span className="text-xs text-ink/40">{d.group}</span>
              </label>
              <a href={d.url} download title="הורדת הקובץ" className="btn shrink-0 px-2 py-1 text-xs">
                הורדה
              </a>
            </li>
          ))}
        </ul>
      </section>
    </PanelShell>
  );
}
