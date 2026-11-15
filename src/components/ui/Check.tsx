import { usePlanStore } from '../../store/planStore';

/** תיבת סימון: לחיצה מסמנת וי, לחיצה כפולה מבטלת. הסימון נשמר בדפדפן לפי המזהה */
export default function Check({ id, label = 'בוצע' }: { id: string; label?: string }) {
  const done = usePlanStore((s) => s.checks[id]?.done ?? false);
  const setCheck = usePlanStore((s) => s.setCheck);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      title={`${label}. לחיצה: סימון. לחיצה כפולה: ביטול`}
      onClick={() => setCheck(id, { done: true })}
      onDoubleClick={() => setCheck(id, { done: false })}
      className={`no-print inline-flex h-6 w-6 shrink-0 items-center justify-center align-middle shadow-[inset_0_0_0_2px_#2E2E2B] transition-shadow hover:shadow-[inset_0_0_0_2px_#2E2E2B,0_2px_6px_rgba(46,46,43,.35)] ${done ? 'bg-done text-white shadow-none' : 'bg-white'}`}
    >
      {done && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </button>
  );
}
