import { PANELS, TONE_LABEL, type InsightItem, type PanelId, type Tone } from '../../data/insights';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';

const TONE_CLS: Record<Tone, string> = {
  ok: 'bg-done/10 text-done',
  pro: 'bg-done/10 text-done',
  part: 'bg-part/15 text-part',
  miss: 'bg-red-700/10 text-red-800',
  con: 'bg-red-700/10 text-red-800',
  idea: 'bg-[#F4E9A8] text-ink',
  ask: 'bg-ink/[0.08] text-ink',
  plain: '',
};

export function ItemRow({ it, n }: { it: InsightItem; n?: number }) {
  const go = usePlanStore((s) => s.go);
  const tone = it.tone ?? 'plain';
  return (
    <li className="flex gap-2 bg-ink/[0.03] p-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">
          {n !== undefined && <span className="text-ink/45">{n}. </span>}
          {TONE_LABEL[tone] && <span className={`ml-2 inline-block px-1.5 text-xs font-semibold ${TONE_CLS[tone]}`}>{TONE_LABEL[tone]}</span>}
          {it.t}
        </p>
        {it.d && <p className="mt-0.5 text-sm leading-relaxed text-ink/75">{it.d}</p>}
        {it.ask && (
          <p className="mt-1 text-sm leading-relaxed">
            <span className="font-semibold">לדרוש: </span>
            {it.ask}
          </p>
        )}
        {it.ref && <p className="mt-0.5 text-xs text-ink/45">מקור: {it.ref}</p>}
      </div>
      {it.go && (
        <button className="btn no-print h-fit w-16 shrink-0 px-1 py-1.5 text-xs leading-tight" onClick={() => go(it.go!)} title="מציג את הנושא במודל שמימין">
          הצגה במודל
        </button>
      )}
    </li>
  );
}

export default function InsightPanelView({ id }: { id: PanelId }) {
  const p = PANELS.find((x) => x.id === id);
  if (!p) return null;
  return (
    <PanelShell name={p.name} title={p.title} lead={p.lead}>
      {p.blocks.map((b) => {
        // ספירת הסטטוסים בבלוק: המספר מספר את הסיפור
        const count = (t: Tone) => b.items.filter((i) => i.tone === t).length;
        const audit = count('ok') + count('part') + count('miss') === b.items.length && b.items.length > 3;
        return (
          <section key={b.h} className="mt-5">
            <h3 className="text-sm font-semibold">{b.h}</h3>
            {audit && (
              <p className="mt-1 text-sm">
                מתוך <span className="font-semibold">{b.items.length}</span> דרישות: <span className="font-semibold text-done">{count('ok')}</span> קיימות,{' '}
                <span className="font-semibold text-part">{count('part')}</span> חלקיות, <span className="font-semibold text-red-800">{count('miss')}</span> חסרות.
              </p>
            )}
            {audit && (
              <div className="mt-1 flex h-2 gap-0.5" aria-hidden>
                {b.items.map((i, k) => (
                  <span key={k} className={`flex-1 ${i.tone === 'ok' ? 'bg-done' : i.tone === 'part' ? 'bg-part/50' : 'bg-red-700/60'}`} />
                ))}
              </div>
            )}
            {b.note && <p className="mt-1 text-xs text-ink/50">{b.note}</p>}
            <ul className="mt-2 space-y-1">
              {b.items.map((it, i) => (
                <ItemRow key={i} it={it} n={b.numbered ? i + 1 : undefined} />
              ))}
            </ul>
          </section>
        );
      })}
      <p className="mt-5 text-xs leading-relaxed text-ink/50">{p.source}</p>
    </PanelShell>
  );
}
