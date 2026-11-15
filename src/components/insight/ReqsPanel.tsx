import { useState } from 'react';
import { FAMILY, REQUIREMENTS, type ReqFamily } from '../../data/requirements';
import { usePlanStore } from '../../store/planStore';
import Check from '../ui/Check';
import { IconBtn } from '../ui/Icon';
import ShowBtn from '../ui/ShowBtn';
import PanelShell from './PanelShell';

/** דרישות מתקנות, מהאוגדן ומההנחיות המרחביות: רק מה שלא מתקיים. מסמנים "תוקן", או מסירים */
export default function ReqsPanel() {
  const checks = usePlanStore((s) => s.checks);
  const setCheck = usePlanStore((s) => s.setCheck);
  const [fam, setFam] = useState<ReqFamily>('ogdan');
  const live = REQUIREMENTS.filter((r) => !checks[r.id]?.removed);
  const open = live.filter((r) => !checks[r.id]?.done).length;
  const list = live.filter((r) => r.family === fam);
  const removed = REQUIREMENTS.filter((r) => r.family === fam && checks[r.id]?.removed);
  const f = FAMILY[fam];
  return (
    <PanelShell
      name="תקנות, אוגדן והנחיות"
      title={`${open} דרישות עוד לא מתקיימות, מתוך ${live.length}`}
      lead="כאן מופיעות רק דרישות שהתוכנית אינה עומדת בהן, או שאי אפשר להוכיח עמידה. לכל דרישה רשום המקור. מסמנים וי כשהיא תוקנה, ומסירים דרישה שאינה רלוונטית."
    >
      <div className="no-print mt-4 grid grid-cols-3 gap-1">
        {(Object.keys(FAMILY) as ReqFamily[]).map((k) => (
          <button key={k} title={FAMILY[k].src} aria-pressed={fam === k} onClick={() => setFam(k)} className={`btn flex-col gap-0 px-1 py-2 text-xs ${fam === k ? 'btn-on' : ''}`}>
            <span className="text-lg font-semibold leading-none">{live.filter((r) => r.family === k && !checks[r.id]?.done).length}</span>
            {FAMILY[k].name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/55">
        מקור: {f.src}.{' '}
        {f.app && (
          <a href={f.app} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            פתיחת האפליקציה
          </a>
        )}
      </p>
      {list.length === 0 && <p className="mt-3 bg-ink/[0.04] p-3 text-sm leading-relaxed">{f.empty ?? 'אין דרישות פתוחות במקור הזה.'}</p>}
      <ol className="mt-3 space-y-2">
        {list.map((r, i) => {
          const done = checks[r.id]?.done;
          return (
            <li key={r.id} className={`grid grid-cols-[2.2rem_1fr] gap-x-2 p-3 ${done ? 'bg-done/10' : 'bg-ink/[0.03]'}`}>
              <span className="text-3xl font-light leading-none text-ink/35">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-base font-semibold leading-snug">{r.text}</p>
                <p className="text-xs text-ink/50">מקור: {FAMILY[r.family].name}, {r.ref}.</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/75">
                  <span className="font-semibold text-ink">הפער: </span>
                  {r.gap} <span className="text-xs text-ink/50">({r.measured ? 'נמדד במודל' : 'מקריאת המסמכים'})</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  <span className="font-semibold">מה לתקן: </span>
                  <span className="bg-[#F4E9A8] px-1">{r.fix}</span>
                </p>
                <div className="no-print mt-2 flex items-center gap-2">
                  <Check id={r.id} label="תוקן" />
                  <span className="text-xs text-ink/60">{done ? 'תוקן' : 'סימון כשתוקן'}</span>
                  <span className="flex-1" />
                  {r.go && <ShowBtn go={r.go} className="" />}
                  <IconBtn icon="trash" label="הסרה מהרשימה" onClick={() => setCheck(r.id, { removed: true })} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {removed.length > 0 && (
        <p className="no-print mt-3 text-xs text-ink/60">
          הוסרו {removed.length}.{' '}
          <button className="underline underline-offset-4" title="החזרת הדרישות שהוסרו" onClick={() => removed.forEach((r) => setCheck(r.id, { removed: false }))}>
            החזרה לרשימה
          </button>
        </p>
      )}
    </PanelShell>
  );
}
