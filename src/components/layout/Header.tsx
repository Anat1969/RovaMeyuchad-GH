import { useEffect, useRef, useState } from 'react';
import { completionStats, usePlanStore } from '../../store/planStore';
import { DECK_NAME, DECK_URL, PANELS, type PanelId } from '../../data/insights';
import Badge from '../ui/Badge';

const BUTTONS: { id: PanelId; name: string }[] = [
  ...PANELS.filter((p) => p.id === 'prep' || p.id === 'people').map((p) => ({ id: p.id, name: p.name })),
  { id: 'metrics', name: 'התאמה למדדים' },
  { id: 'status', name: 'מה בוצע' },
  ...PANELS.filter((p) => p.id === 'proscons' || p.id === 'ideas').map((p) => ({ id: p.id, name: p.name })),
  { id: 'work', name: 'תוכנית עבודה' },
];

export default function Header() {
  const topics = usePlanStore((s) => s.topics);
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const toggleEditMode = usePlanStore((s) => s.toggleEditMode);
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const resetData = usePlanStore((s) => s.resetData);
  const setView = usePlanStore((s) => s.setView);
  const panel = usePlanStore((s) => s.panel);
  const setPanel = usePlanStore((s) => s.setPanel);
  const { total, complete } = completionStats(topics);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !menu.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-3 bg-white px-3 shadow-[0_1px_0_#E7E2DA] md:px-6">
      <button
        className="shrink-0 truncate text-right text-lg font-light text-ink hover:opacity-70"
        title="חזרה למבט הכולל"
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

      {/* כפתורי התובנות: כל אחד פורס את המידע שלו בשליש המסך, מקושר למודל */}
      <nav aria-label="תובנות" className="flex min-w-0 flex-1 items-stretch justify-center gap-1 overflow-x-auto">
        {BUTTONS.map((b) => (
          <button
            key={b.id}
            aria-pressed={panel === b.id}
            onClick={() => setPanel(panel === b.id ? null : b.id)}
            className={`btn shrink-0 whitespace-nowrap px-3 py-2 text-sm ${panel === b.id ? 'btn-on shadow-md' : ''}`}
          >
            {b.name}
          </button>
        ))}
      </nav>

      <a
        className="btn shrink-0 whitespace-nowrap px-3 py-2 text-sm underline decoration-ink/30 underline-offset-4"
        href={DECK_URL}
        target="_blank"
        rel="noreferrer"
        title={`${DECK_NAME}. נפתחת בלשונית חדשה`}
      >
        המצגת
      </a>

      <div className="relative shrink-0" ref={menu}>
        <button
          className={`btn h-9 w-9 font-semibold ${isEditMode ? 'btn-on' : ''}`}
          aria-haspopup="menu"
          aria-expanded={open}
          title="תפריט: עריכה ומערכת"
          onClick={() => setOpen((o) => !o)}
        >
          ר3
        </button>
        {open && (
          <div role="menu" className="fade-in absolute left-0 top-11 z-30 w-64 bg-white p-1 shadow-xl">
            <button
              role="menuitem"
              className="block w-full px-3 py-2 text-right text-sm hover:bg-ink/[0.06]"
              onClick={() => {
                toggleEditMode();
                setPanel(null);
                setOpen(false);
              }}
            >
              <span className="font-semibold">{isEditMode ? 'סיום עריכה' : 'מצב עריכה'}</span>
              <span className="block text-xs text-ink/60">השלמת פרקים חסרים ועדכון מפרטים</span>
            </button>
            <button
              role="menuitem"
              className="block w-full px-3 py-2 text-right text-sm hover:bg-ink/[0.06]"
              onClick={() => {
                if (window.confirm('להחזיר את כל הנתונים לנוסח המקורי? העריכות והמשימות שהוספת יימחקו.')) resetData();
                setOpen(false);
              }}
            >
              <span className="font-semibold">איפוס לנתוני המקור</span>
              <span className="block text-xs text-ink/60">מוחק את מה שנשמר בדפדפן הזה</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
