import { useState } from 'react';
import { PANELS, TONE_LABEL, type InsightBlock, type InsightItem, type PanelId, type Tone } from '../../data/insights';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import { IconBtn } from '../ui/Icon';

const TONE_CLS: Record<Tone, string> = {
  ok: 'bg-done/10 text-done',
  pro: 'bg-done/10 text-done',
  part: 'bg-[#D9A23D]/20 text-[#7A5A12]',
  miss: 'bg-red-700/10 text-red-800',
  con: 'bg-red-700/10 text-red-800',
  idea: 'bg-[#F4E9A8] text-ink',
  ask: 'bg-ink/[0.08] text-ink',
  plain: '',
};

/** שורה בלוח: מספר גדול, הטענה, ההסבר, ההנחיה לאדריכל, וקישור למודל */
export function ItemRow({ it, n }: { it: InsightItem; n: number }) {
  const go = usePlanStore((s) => s.go);
  const tone = it.tone ?? 'plain';
  return (
    <li className="grid grid-cols-[2.2rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
      <span className="text-3xl font-light leading-none text-ink/35">{n}</span>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-snug">
          {TONE_LABEL[tone] && <span className={`ml-2 inline-block px-1.5 text-xs font-semibold ${TONE_CLS[tone]}`}>{TONE_LABEL[tone]}</span>}
          {it.t}
        </p>
        {it.d && <p className="mt-1 text-sm leading-relaxed text-ink/75">{it.d}</p>}
        {it.ask && (
          <p className="mt-1 text-base leading-relaxed">
            <span className="bg-[#F4E9A8] px-1 font-semibold">הנחיה לאדריכל</span> {it.ask}
          </p>
        )}
        {it.ref && <p className="mt-1 text-xs text-ink/45">מקור: {it.ref}</p>}
        {it.go && (
<IconBtn icon="show" label="הצגה במודל" className="no-print mt-2" onClick={() => go(it.go!)} />
        )}
      </div>
    </li>
  );
}

const count = (b: InsightBlock, t: Tone) => b.items.filter((i) => i.tone === t).length;
const isAudit = (b: InsightBlock) => b.items.length > 3 && count(b, 'ok') + count(b, 'part') + count(b, 'miss') === b.items.length;

function Block({ b, hidden }: { b: InsightBlock; hidden: boolean }) {
  const audit = isAudit(b);
  return (
    // בלוק שאינו נבחר במיני-סרגל מוסתר במסך, אבל מודפס
    <section className={`mt-5 ${hidden ? 'hidden print:block' : ''}`}>
      <h3 className="text-lg font-semibold">
        {b.h} {b.sub && <span className="text-sm font-normal text-ink/50">{b.sub}</span>}
      </h3>
      {audit && (
        <>
          <p className="mt-1 text-base">
            מתוך <span className="font-semibold">{b.items.length}</span> דרישות: <span className="font-semibold text-done">{count(b, 'ok')}</span> קיימות,{' '}
            <span className="font-semibold text-[#7A5A12]">{count(b, 'part')}</span> חלקיות, <span className="font-semibold text-red-800">{count(b, 'miss')}</span> חסרות.
          </p>
          <div className="mt-1 flex h-3 gap-0.5" aria-hidden>
            {b.items.map((i, k) => (
              <span key={k} className={`flex-1 ${i.tone === 'ok' ? 'bg-done' : i.tone === 'part' ? 'bg-[#D9A23D]' : 'bg-red-700/70'}`} />
            ))}
          </div>
        </>
      )}
      {b.note && <p className="mt-1 text-xs text-ink/50">{b.note}</p>}
      <ol className="mt-2 space-y-2">
        {b.items.map((it, i) => (
          <ItemRow key={i} it={it} n={i + 1} />
        ))}
      </ol>
    </section>
  );
}

export default function InsightPanelView({ id }: { id: PanelId }) {
  const p = PANELS.find((x) => x.id === id);
  const [tab, setTab] = useState(0);
  if (!p) return null;
  return (
    <PanelShell name={p.name} title={p.title} lead={p.lead}>
      {p.tabs && (
        <div className="no-print mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${p.blocks.length}, 1fr)` }} role="tablist">
          {p.blocks.map((b, i) => (
            <button key={b.h} role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={`btn flex-col gap-0 px-2 py-2 ${tab === i ? 'btn-on' : ''}`}>
              <span className="text-base font-semibold">{b.h}</span>
              <span className={`text-xs ${tab === i ? 'text-white/75' : 'text-ink/55'}`}>
                {isAudit(b) ? `${count(b, 'ok')} קיימות, ${count(b, 'part')} חלקיות, ${count(b, 'miss')} חסרות` : b.sub}
              </span>
            </button>
          ))}
        </div>
      )}
      {p.blocks.map((b, i) => (
        <Block key={b.h} b={b} hidden={!!p.tabs && tab !== i} />
      ))}
      <p className="mt-5 text-xs leading-relaxed text-ink/50">{p.source}</p>
    </PanelShell>
  );
}
