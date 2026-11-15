import { useState } from 'react';
import { sortedTopics, usePlanStore } from '../../store/planStore';
import Badge from '../ui/Badge';

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
      className="flex shrink-0 gap-1 overflow-x-auto bg-ink/[0.03] p-2 md:h-full md:w-[clamp(13rem,15vw,17rem)] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:p-3"
    >
      <p className="hidden px-2 pb-2 pt-1 text-xs text-ink/50 md:block">נושאי התוכנית, לפי סדר הפרקים</p>
      {sortedTopics(topics).map((t) => {
        const on = t.id === selectedTopicId;
        return (
          <button
            key={t.id}
            onClick={() => selectTopic(on ? null : t.id)}
            aria-pressed={on}
            className={`flex shrink-0 items-center gap-3 px-3 py-3 text-right text-sm transition-shadow md:w-full ${
              on ? 'bg-white font-semibold shadow-md' : 'hover:bg-white hover:shadow-sm'
            }`}
            style={{ boxShadow: on ? `inset -4px 0 0 ${t.layerColor ?? '#2E2E2B'}, 0 2px 8px rgba(46,46,43,.12)` : undefined }}
          >
            <span className="h-3 w-3 shrink-0" style={{ background: t.layerColor ?? '#77736C' }} />
            <span className="flex-1 whitespace-nowrap">{t.nameHe}</span>
            <Badge status={t.status} />
          </button>
        );
      })}

      {isEditMode && (
        <form
          className="mt-2 flex shrink-0 gap-1 md:mt-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addTopic(name.trim());
            setName('');
          }}
        >
          <input
            className="field min-w-0 flex-1"
            placeholder="שם נושא חדש"
            aria-label="שם נושא חדש"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn shrink-0" disabled={!name.trim()}>
            הוסיפי
          </button>
        </form>
      )}
    </nav>
  );
}
