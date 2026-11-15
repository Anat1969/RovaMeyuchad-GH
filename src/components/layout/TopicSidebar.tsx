import { useState } from 'react';
import type { Analysis } from '../../analysis/engine';
import type { PanelId } from '../../data/insights';
import { PANEL_HINT, PANEL_NAME, stage as stageInfo } from '../../data/stages';
import { sortedTopics, usePlanStore } from '../../store/planStore';
import type { ItemStatus, PlanTopic } from '../../types/plan';
import { STATUS_LABEL } from '../ui/Badge';

const DOT: Record<ItemStatus, string> = { complete: 'bg-done', partial: 'bg-part', pending: 'bg-wait' };
const STATUTORY = ['massing', 'public'];
const ANALYSES: { id: Analysis; name: string; hint: string }[] = [
  { id: 'shade', name: 'הצללות', hint: 'צל לפי שעה ועונה' },
  { id: 'wind', name: 'רוח', hint: 'אזורים מוגנים וחשופים' },
  { id: 'water', name: 'ניקוז', hint: 'לאן הנגר זורם' },
  { id: 'heat', name: 'חום', hint: 'מפת עומס חום' },
];
const PANELS: Record<number, PanelId[]> = { 1: ['appendix'], 2: ['people', 'metrics'], 3: ['section'], 4: ['prep', 'diff', 'status', 'proscons', 'ideas', 'work', 'send'] };

/** החלופה שנבחרה בנושא, אם יש בו חלופות */
function chosen(t: PlanTopic) {
  const item = t.items.find((i) => i.alternatives?.length);
  return item?.alternatives?.find((a) => a.id === item.selectedAlternativeId)?.label;
}

/** סרגל השלב: הכלים, הנושאים והלוחות של השלב שנבחר, ממוספרים. הנבחר בצבע השלב */
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
  const list = sortedTopics(topics).filter((t) => (stageId === 1 ? STATUTORY.includes(t.id) : stageId === 3 ? !STATUTORY.includes(t.id) : false));
  let n = 0;

  const cls = (on: boolean) =>
    `flex min-w-max flex-1 items-center justify-center gap-2 px-3 text-sm transition-shadow ${on ? 'font-semibold text-white shadow-lg' : 'bg-white/60 hover:bg-white hover:shadow-sm'}`;
  const bg = (on: boolean) => (on ? { background: st.color } : undefined);
  const num = (on: boolean) => <span className={`text-xs ${on ? 'text-white/60' : 'text-ink/40'}`}>{++n}</span>;
  const panelBtn = (id: PanelId) => {
    const on = panel === id;
    return (
      <button key={id} aria-pressed={on} title={PANEL_HINT[id]} onClick={() => setPanel(on ? null : id)} className={cls(on)} style={bg(on)}>
        {num(on)}
        <span className="whitespace-nowrap">{PANEL_NAME[id]}</span>
      </button>
    );
  };

  return (
    <nav aria-label={`שלב ${st.id}: ${st.name}`} className="no-print flex h-12 shrink-0 items-stretch gap-1 overflow-x-auto bg-ink/[0.05] px-2 py-1 md:px-6">
      <span className="hidden shrink-0 items-center px-2 text-xs font-semibold text-white xl:flex" style={{ background: st.color }} title={st.what}>
        {st.tag}
      </span>
      {stageId === 1 && panelBtn('appendix')}
      {stageId === 3 && (
        <button
          aria-pressed={selectedTopicId === null && !panel}
          title="כל שכבות הפיתוח יחד"
          onClick={() => {
            setPanel(null);
            go({ topic: null });
          }}
          className={cls(selectedTopicId === null && !panel)}
          style={bg(selectedTopicId === null && !panel)}
        >
          כל הנושאים
        </button>
      )}
      {list.map((t) => {
        const on = t.id === selectedTopicId && !panel;
        return (
          <button
            key={t.id}
            onClick={() => {
              setPanel(null);
              go({ topic: on ? null : t.id });
            }}
            aria-pressed={on}
            title={`השכבות של ${t.nameHe}. ${STATUS_LABEL[t.status]}`}
            className={cls(on)}
            style={on ? { background: st.color, boxShadow: `inset 0 -4px 0 ${t.layerColor ?? '#fff'}, 0 4px 10px rgba(46,46,43,.25)` } : undefined}
          >
            {num(on)}
            <span className="whitespace-nowrap">{t.nameHe}</span>
            {on && chosen(t) && <span className="whitespace-nowrap text-xs font-normal text-white/70">{chosen(t)}</span>}
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[t.status]} ${on ? 'ring-2 ring-white' : ''}`} />
          </button>
        );
      })}
      {stageId !== 1 && PANELS[stageId].map(panelBtn)}
      {stageId === 2 &&
        ANALYSES.map((x) => {
          const on = analysis === x.id;
          return (
            <button key={x.id} aria-pressed={on} title={x.hint} onClick={() => setAnalysis(on ? null : x.id)} className={cls(on)} style={bg(on)}>
              {num(on)}
              <span className="whitespace-nowrap">{x.name}</span>
            </button>
          );
        })}

      {/* מקרא הסטטוס, רק בשלבים שיש בהם נושאים */}
      {list.length > 0 && (
        <div className="hidden shrink-0 items-center gap-3 px-2 text-xs text-ink/60 lg:flex">
          {(['complete', 'partial', 'pending'] as ItemStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      )}

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
