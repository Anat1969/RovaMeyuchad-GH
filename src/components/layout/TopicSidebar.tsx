import { useState } from 'react';
import { sortedTopics, usePlanStore } from '../../store/planStore';
import { STATUS_LABEL } from '../ui/Badge';
import type { ItemStatus, PlanTopic } from '../../types/plan';

const DOT: Record<ItemStatus, string> = { complete: 'bg-done', partial: 'bg-part', pending: 'bg-wait' };

/** החלופה שנבחרה בנושא, אם יש בו חלופות */
function chosen(t: PlanTopic) {
  const item = t.items.find((i) => i.alternatives?.length);
  return item?.alternatives?.find((a) => a.id === item.selectedAlternativeId)?.label;
}

/** סרגל הנושאים: ממוספר, הסטטוס כנקודה, והנבחר שחור מלא */
export default function TopicSidebar() {
  const topics = usePlanStore((s) => s.topics);
  const selectedTopicId = usePlanStore((s) => s.selectedTopicId);
  const go = usePlanStore((s) => s.go);
  const view = usePlanStore((s) => s.view.name);
  const setPanel = usePlanStore((s) => s.setPanel);
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const addTopic = usePlanStore((s) => s.addTopic);
  const [name, setName] = useState('');
  const list = sortedTopics(topics);
  const allOn = selectedTopicId === null && view === 'detail';

  const cls = (on: boolean) =>
    `flex min-w-max flex-1 items-center justify-center gap-2 px-3 text-sm transition-shadow ${
      on ? 'bg-ink font-semibold text-white shadow-lg' : 'bg-white/60 hover:bg-white hover:shadow-sm'
    }`;

  return (
    <nav aria-label="נושאי התוכנית" className="no-print flex h-12 shrink-0 items-stretch gap-1 overflow-x-auto bg-ink/[0.05] px-2 py-1 md:px-6">
      <button
        aria-pressed={allOn}
        title="כל שכבות הפיתוח יחד, במבט קרוב על הרחוב"
        onClick={() => {
          setPanel(null);
          go({ topic: null, view: 'detail' });
        }}
        className={cls(allOn)}
      >
        כל הנושאים
      </button>
      {list.map((t, i) => {
        const on = t.id === selectedTopicId;
        return (
          <button
            key={t.id}
            onClick={() => {
              setPanel(null);
              go(on ? { topic: null, view: 'perspective' } : { topic: t.id, view: t.id === 'massing' || t.id === 'public' ? 'perspective' : 'detail' });
            }}
            aria-pressed={on}
            title={`${t.nameHe}: ${STATUS_LABEL[t.status]}`}
            className={cls(on)}
            style={{ boxShadow: on ? `inset 0 -4px 0 ${t.layerColor ?? '#fff'}, 0 4px 10px rgba(46,46,43,.25)` : undefined }}
          >
            <span className={`text-xs ${on ? 'text-white/60' : 'text-ink/40'}`}>{i + 1}</span>
            <span className="whitespace-nowrap">{t.nameHe}</span>
            {on && chosen(t) && <span className="whitespace-nowrap text-xs font-normal text-white/70">{chosen(t)}</span>}
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[t.status]} ${on ? 'ring-2 ring-white' : ''}`} />
          </button>
        );
      })}

      {/* מקרא הסטטוס, פעם אחת, במקום תג על כל כפתור */}
      <div className="hidden shrink-0 items-center gap-3 px-2 text-xs text-ink/60 lg:flex">
        {(['complete', 'partial', 'pending'] as ItemStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {isEditMode && (
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
