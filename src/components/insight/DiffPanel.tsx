import { useState } from 'react';
import { DIFFERENCES, VERDICT, type Verdict } from '../../data/differences';
import { usePlanStore } from '../../store/planStore';
import Tag from '../ui/Tag';
import Check from '../ui/Check';
import PanelShell from './PanelShell';
import ShowBtn from '../ui/ShowBtn';

/** תב"ע מול תוכנית הבינוי: שני הצדדים זה מול זה, עם המקור של כל אחד */
export default function DiffPanel() {
  const checks = usePlanStore((s) => s.checks);
  const [f, setF] = useState<Verdict | null>(null);
  const count = (v: Verdict) => DIFFERENCES.filter((d) => d.verdict === v).length;
  const list = DIFFERENCES.filter((d) => !f || d.verdict === f);
  return (
    <PanelShell
      name='תב"ע מול תכנון'
      title={`${count('gap')} הבדלים ו-${count('missing')} חסרים בין התב"ע לתוכנית הבינוי`}
      lead="בכל שורה: מה התכניות המאושרות קובעות, מה תוכנית הבינוי מציעה, ומה צריך לעשות. לכל צד רשום המסמך שממנו נלקח המידע."
    >
      <div className="no-print mt-4 grid grid-cols-5 gap-1">
        <button title="כל השורות" aria-pressed={!f} onClick={() => setF(null)} className={`btn px-1 py-1.5 text-xs ${!f ? 'btn-on' : ''}`}>
          הכול {DIFFERENCES.length}
        </button>
        {(Object.keys(VERDICT) as Verdict[]).map((v) => (
          <button key={v} title={`רק ${VERDICT[v].name}`} aria-pressed={f === v} onClick={() => setF(f === v ? null : v)} className={`btn px-1 py-1.5 text-xs ${f === v ? 'btn-on' : ''}`}>
            {VERDICT[v].name} {count(v)}
          </button>
        ))}
      </div>
      <ol className="mt-3 space-y-2">
        {list.map((d, i) => (
          <li key={d.topic} className="grid grid-cols-[2.2rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
            <span className="text-3xl font-light leading-none text-ink/35">{i + 1}</span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-snug">
                {d.topic}{' '}
                <span className="px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: VERDICT[d.verdict].color }}>
                  {VERDICT[d.verdict].name}
                </span>
              </h3>
              <div className="mt-2 border-r-4 pr-2" style={{ borderColor: '#2B4C7E' }}>
                <Tag s={1} /> <span className="text-sm leading-relaxed">{d.statutory}</span>
                <p className="text-xs text-ink/50">מקור: {d.statSrc}.</p>
              </div>
              <div className="mt-2 border-r-4 pr-2" style={{ borderColor: '#B8642B' }}>
                <Tag s={3} /> <span className="text-sm leading-relaxed">{d.design}</span>
                <p className="text-xs text-ink/50">מקור: {d.designSrc}.</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                <span className="font-semibold">מה לעשות: </span>
                <span className="bg-[#F4E9A8] px-1">{d.todo}</span>
              </p>
              <div className="no-print mt-2 flex items-center gap-2">
                <Check id={`diff-${d.topic}`} label="טופל" />
                <span className="text-xs text-ink/60">{checks[`diff-${d.topic}`]?.done ? 'טופל' : 'סימון כשטופל'}</span>
                <span className="flex-1" />
                {d.go && <ShowBtn go={d.go} className="" />}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs leading-relaxed text-ink/50">הנתונים נקראו בעין ממסמכים סרוקים. לפני שימוש רשמי, לאמת מול המסמך המקורי.</p>
    </PanelShell>
  );
}
