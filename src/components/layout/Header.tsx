import { completionStats, usePlanStore } from '../../store/planStore';
import Icon from '../ui/Icon';
import { STAGES } from '../../data/stages';
import Badge from '../ui/Badge';

export default function Header() {
  const topics = usePlanStore((s) => s.topics);
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const setView = usePlanStore((s) => s.setView);
  const panel = usePlanStore((s) => s.panel);
  const stageId = usePlanStore((s) => s.stage);
  const setStage = usePlanStore((s) => s.setStage);
  const setPanel = usePlanStore((s) => s.setPanel);
  const { total, complete } = completionStats(topics);

  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-3 bg-white px-3 shadow-[0_1px_0_#E7E2DA] md:px-6">
      <button
        className="shrink-0 truncate text-right text-lg font-light text-ink hover:opacity-70"
        title="מבט כולל"
        onClick={() => {
          setPanel(null);
          selectTopic(null);
          setView('perspective');
        }}
      >
        תוכנית בינוי <span className="text-ink/40">|</span> <span className="font-semibold">הרובע המיוחד אשדוד</span>
      </button>
      <span className="hidden 2xl:block">
        <Badge status={complete === total ? 'complete' : 'pending'} label={`${complete} מתוך ${total} נושאים הושלמו`} />
      </span>

      {/* ארבעת שלבי העבודה. כל שלב פותח בסרגל שמתחת את הכלים שלו */}
      <nav aria-label="שלבי העבודה" className="flex min-w-0 flex-1 items-stretch justify-center gap-1 overflow-x-auto">
        <span className="hidden shrink-0 items-center px-2 text-xs text-ink/55 lg:flex">מהלך העבודה</span>
        {STAGES.map((st) => {
          const on = st.id === stageId;
          return (
            <button
              key={st.id}
              aria-pressed={on}
              title={st.hint}
              onClick={() => setStage(st.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 text-sm transition-shadow ${on ? 'font-semibold text-white shadow-md' : 'bg-ink/[0.05] hover:bg-ink/[0.1]'}`}
              style={on ? { background: st.color } : { boxShadow: `inset 0 -3px 0 ${st.color}` }}
            >
              <span className={`text-lg font-light leading-none ${on ? 'text-white/70' : 'text-ink/40'}`}>{st.id}</span>
              {st.name}
            </button>
          );
        })}
      </nav>

      <button className={`btn shrink-0 gap-2 whitespace-nowrap px-3 py-2 text-sm ${panel === 'library' ? 'btn-on' : ''}`} title="מסמכים, קבצים, מקורות ועריכה" aria-pressed={panel === 'library'} onClick={() => setPanel(panel === 'library' ? null : 'library')}>
        <Icon name="library" size={16} />
        ספרייה ועריכה
      </button>
    </header>
  );
}
