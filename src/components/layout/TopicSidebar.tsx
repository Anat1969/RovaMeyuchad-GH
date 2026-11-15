import { useState, type ReactNode } from 'react';
import type { Analysis } from '../../analysis/engine';
import type { PanelId } from '../../data/insights';
import { PANEL_HINT, PANEL_NAME, stage as stageInfo } from '../../data/stages';
import { sortedTopics, usePlanStore } from '../../store/planStore';
import type { ItemStatus, PlanTopic } from '../../types/plan';
import { STATUS_LABEL } from '../ui/Badge';
import { IconBtn } from '../ui/Icon';

const DOT: Record<ItemStatus, string> = { complete: 'bg-done', partial: 'bg-part', pending: 'bg-wait' };
const STATUTORY = ['massing', 'public'];
const ANALYSES: { id: Analysis; name: string; hint: string }[] = [
  { id: 'shade', name: 'הצללות', hint: 'צל לפי שעה ועונה' },
  { id: 'wind', name: 'רוח', hint: 'כיוון ועוצמה לאורך היום' },
  { id: 'water', name: 'ניקוז', hint: 'לאן הנגר זורם' },
  { id: 'heat', name: 'חום', hint: 'מפת עומס חום' },
];

/** פריט בסרגל: נושא, לוח או כלי ניתוח. כולם באותה רמה, ולכן החצים עוברים ביניהם */
interface Item {
  key: string;
  name: string;
  hint: string;
  on: boolean;
  run: (on: boolean) => void;
  group?: string; // משפחה: מוצגת כתווית לפני הפריט הראשון שלה
  extra?: ReactNode;
  color?: string;
}

/** החלופה שנבחרה בנושא, אם יש בו חלופות */
function chosen(t: PlanTopic) {
  const item = t.items.find((i) => i.alternatives?.length);
  return item?.alternatives?.find((a) => a.id === item.selectedAlternativeId)?.label;
}

/** סרגל השלב: הכלים, הנושאים והלוחות של השלב שנבחר, ממוספרים, עם חצים לפריט הקודם ולבא */
export default function TopicSidebar() {
  const topics = usePlanStore((s) => s.topics);
  const selectedTopicId = usePlanStore((s) => s.selectedTopicId);
  const stageId = usePlanStore((s) => s.stage);
  const panel = usePlanStore((s) => s.panel);
  const analysis = usePlanStore((s) => s.analysis);
  const go = usePlanStore((s) => s.go);
  const setPanel = usePlanStore((s) => s.setPanel);
  const setAnalysis = usePlanStore((s) => s.setAnalysis);
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const addTopic = usePlanStore((s) => s.addTopic);
  const [name, setName] = useState('');
  const st = stageInfo(stageId);

  const panelItem = (id: PanelId, group?: string): Item => ({
    key: id,
    name: PANEL_NAME[id]!,
    hint: PANEL_HINT[id]!,
    on: panel === id,
    group,
    run: (on) => {
      setAnalysis(null);
      setPanel(on ? null : id);
    },
  });
  const topicItem = (t: PlanTopic): Item => ({
    key: t.id,
    name: t.nameHe,
    hint: `השכבות של ${t.nameHe}. ${STATUS_LABEL[t.status]}`,
    on: t.id === selectedTopicId && !panel && !analysis,
    color: t.layerColor,
    extra: (
      <>
        {t.id === selectedTopicId && chosen(t) && <span className="whitespace-nowrap text-xs font-normal opacity-70">{chosen(t)}</span>}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[t.status]}`} />
      </>
    ),
    run: (on) => {
      setPanel(null);
      setAnalysis(null);
      go({ topic: on ? null : t.id });
    },
  });
  const list = sortedTopics(topics);
  const items: Item[] =
    stageId === 1
      ? [panelItem('appendix'), ...list.filter((t) => STATUTORY.includes(t.id)).map(topicItem)]
      : stageId === 2
        ? [
            panelItem('people', 'התאמה'),
            panelItem('metrics', 'התאמה'),
            panelItem('reqs', 'התאמה'),
            ...ANALYSES.map(
              (x): Item => ({ key: x.id, name: x.name, hint: x.hint, on: analysis === x.id, group: 'אקלים ומים', run: (on) => setAnalysis(on ? null : x.id) }),
            ),
          ]
        : stageId === 3
          ? [
              {
                key: 'all',
                name: 'כל הנושאים',
                hint: 'כל שכבות הפיתוח יחד',
                on: selectedTopicId === null && !panel,
                run: () => {
                  setPanel(null);
                  go({ topic: null });
                },
              },
              ...list.filter((t) => !STATUTORY.includes(t.id)).map(topicItem),
              panelItem('section'),
            ]
          : [panelItem('prep', 'סיכום'), panelItem('diff', 'סיכום'), panelItem('status', 'סיכום'), panelItem('proscons', 'הערכה'), panelItem('ideas', 'הערכה'), panelItem('work', 'פעולה'), panelItem('send', 'פעולה')];

  // חצים: הפריט הקודם והבא באותה רמה
  const cur = items.findIndex((i) => i.on);
  const step = (d: number) => {
    const next = items[(Math.max(0, cur) + d + items.length) % items.length];
    if (!next.on) next.run(false);
  };

  return (
    <nav aria-label={`שלב ${st.id}: ${st.name}`} className="no-print flex h-12 shrink-0 items-stretch gap-1 overflow-x-auto bg-ink/[0.08] px-2 py-1 md:px-6">
      <span className="hidden shrink-0 items-center px-2 text-xs font-semibold text-white xl:flex" style={{ background: st.color }} title={st.what}>
        {st.tag}
      </span>
      {items.map((it, i) => (
        <span key={it.key} className="flex min-w-max flex-1 items-stretch gap-1">
          {it.group && it.group !== items[i - 1]?.group && <span className="flex shrink-0 items-center px-1 text-[11px] text-ink/55">{it.group}</span>}
          <button
            aria-pressed={it.on}
            title={it.hint}
            onClick={() => it.run(it.on)}
            className={`flex min-w-max flex-1 items-center justify-center gap-2 px-3 text-sm shadow-[0_1px_0_rgba(46,46,43,.2)] transition-shadow ${it.on ? 'font-semibold text-white shadow-lg' : 'bg-white hover:shadow-md'}`}
            style={it.on ? { background: st.color, boxShadow: it.color ? `inset 0 -4px 0 ${it.color}, 0 4px 10px rgba(46,46,43,.25)` : undefined } : undefined}
          >
            <span className={`text-xs ${it.on ? 'text-white/60' : 'text-ink/40'}`}>{i + 1}</span>
            <span className="whitespace-nowrap">{it.name}</span>
            {it.extra}
          </button>
        </span>
      ))}
      <span className="flex shrink-0 items-center gap-1">
        <IconBtn icon="prev" label="הפריט הקודם" onClick={() => step(-1)} />
        <IconBtn icon="next" label="הפריט הבא" onClick={() => step(1)} />
      </span>

      {isEditMode && stageId === 3 && (
        <form
          className="flex shrink-0 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addTopic(name.trim());
            setName('');
          }}
        >
          <input className="field w-36 py-1.5" placeholder="שם נושא חדש" aria-label="שם נושא חדש" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn shrink-0 py-1.5" disabled={!name.trim()}>
            הוסיפי
          </button>
        </form>
      )}
    </nav>
  );
}
