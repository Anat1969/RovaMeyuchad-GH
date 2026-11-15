import { useEffect, useRef, useState } from 'react';
import { completionStats, usePlanStore } from '../../store/planStore';
import ViewControls from '../viewport/ViewControls';
import Badge from '../ui/Badge';

const PREP_DOC = 'https://claude.ai/artifact/2SHwVYbNVLU1UCkAT6hzyY';

export default function Header() {
  const topics = usePlanStore((s) => s.topics);
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const toggleEditMode = usePlanStore((s) => s.toggleEditMode);
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const resetData = usePlanStore((s) => s.resetData);
  const setView = usePlanStore((s) => s.setView);
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
    <header className="flex h-14 shrink-0 items-center gap-4 bg-white px-4 shadow-[0_1px_0_#E7E2DA] md:px-6">
      <button
        className="truncate text-right text-lg font-light text-ink hover:opacity-70"
        title="חזרה למבט הכולל"
        onClick={() => {
          selectTopic(null);
          setView('perspective');
        }}
      >
        תוכנית בינוי <span className="text-ink/40">|</span> <span className="font-semibold">הרובע המיוחד אשדוד</span>
      </button>

      <Badge
        status={complete === total ? 'complete' : 'pending'}
        label={`${complete} מתוך ${total} נושאים הושלמו`}
      />

      <div className="flex-1" />
      <div className="hidden md:block">
        <ViewControls />
      </div>

      <div className="relative" ref={menu}>
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
          <div role="menu" className="fade-in absolute left-0 top-11 z-20 w-64 bg-white p-1 shadow-xl">
            <button
              role="menuitem"
              className="block w-full px-3 py-2 text-right text-sm hover:bg-ink/[0.06]"
              onClick={() => {
                toggleEditMode();
                setOpen(false);
              }}
            >
              <span className="font-semibold">{isEditMode ? 'סיום עריכה' : 'מצב עריכה'}</span>
              <span className="block text-xs text-ink/60">השלמת פרקים חסרים ועדכון מפרטים</span>
            </button>
            <a
              role="menuitem"
              className="block px-3 py-2 text-sm hover:bg-ink/[0.06]"
              href={PREP_DOC}
              target="_blank"
              rel="noreferrer"
            >
              <span className="font-semibold">מסמך הכנה לישיבה</span>
              <span className="block text-xs text-ink/60">נפתח בלשונית חדשה</span>
            </a>
            <button
              role="menuitem"
              className="block w-full px-3 py-2 text-right text-sm hover:bg-ink/[0.06]"
              onClick={() => {
                if (window.confirm('להחזיר את כל הנתונים לנוסח המקורי של התוכנית? העריכות יימחקו.')) resetData();
                setOpen(false);
              }}
            >
              <span className="font-semibold">איפוס לנתוני המקור</span>
              <span className="block text-xs text-ink/60">מוחק את העריכות שנשמרו בדפדפן הזה</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
