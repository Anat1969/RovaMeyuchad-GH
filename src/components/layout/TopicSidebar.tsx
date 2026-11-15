import { useState } from 'react';
import { sortedTopics, usePlanStore } from '../../store/planStore';
import Badge from '../ui/Badge';
import type { PlanTopic } from '../../types/plan';

/** החלופה שנבחרה בנושא, אם יש בו חלופות */
function chosen(t: PlanTopic) {
  const item = t.items.find((i) => i.alternatives?.length);
  return item?.alternatives?.find((a) => a.id === item.selectedAlternativeId)?.label;
}

export default function TopicSidebar() {
  const topics = usePlanStore((s) => s.topics);
  const selectedTopicId = usePlanStore((s) => s.selectedTopicId);
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const addTopic = usePlanStore((s) => s.addTopic);
  const [name, setName] = useState('');

  return (
    <nav
      aria-label="נושאי התוכנית"
      className="flex h-12 shrink-0 items-stretch gap-1 overflow-x-auto bg-ink/[0.03] px-2 py-1 md:px-6"
    >
      {sortedTopics(topics).map((t) => {
        const on = t.id === selectedTopicId;
        return (
          <button
            key={t.id}
            onClick={() => selectTopic(on ? null : t.id)}
            aria-pressed={on}
            className={`flex min-w-max flex-1 items-center justify-center gap-2 px-3 text-sm transition-shadow ${
              on ? 'bg-white font-semibold' : 'hover:bg-white hover:shadow-sm'
            }`}
            style={{ boxShadow: on ? `inset 0 -4px 0 ${t.layerColor ?? '#2E2E2B'}, 0 2px 8px rgba(46,46,43,.12)` : undefined }}
          >
            <span className="h-3 w-3 shrink-0" style={{ background: t.layerColor ?? '#77736C' }} />
            <span className="whitespace-nowrap">{t.nameHe}</span>
            {on && chosen(t) && <span className="whitespace-nowrap text-xs font-normal text-ink/55">{chosen(t)}</span>}
            <Badge status={t.status} />
          </button>
        );
      })}

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
          <input
            className="field w-36 py-1.5"
            placeholder="שם נושא חדש"
            aria-label="שם נושא חדש"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn shrink-0 py-1.5" disabled={!name.trim()}>
            הוסיפי
          </button>
        </form>
      )}
    </nav>
  );
}
