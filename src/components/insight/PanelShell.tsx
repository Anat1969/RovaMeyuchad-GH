import { useRef, useState, type ReactNode } from 'react';
import { usePlanStore } from '../../store/planStore';

/**
 * מעטפת לכל לוח תובנות: כותרת, פעולות (הדפסה, העתקה, מייל) ותוכן.
 * הטקסט לשליחה נלקח מהתוכן עצמו, כך שמה שמודפס ומה שנשלח זהים למה שמוצג.
 */
export default function PanelShell({ name, title, lead, children }: { name: string; title: string; lead?: string; children: ReactNode }) {
  const setPanel = usePlanStore((s) => s.setPanel);
  const body = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');

  const text = () => (body.current?.innerText ?? '').replace(/\n{3,}/g, '\n\n').trim();
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), 3500);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      flash('הטקסט הועתק');
      return true;
    } catch {
      flash('ההעתקה נחסמה בדפדפן. אפשר לסמן ולהעתיק ידנית.');
      return false;
    }
  };
  const mail = async () => {
    const full = text();
    const subject = `הרובע המיוחד אשדוד: ${name}`;
    // קישור מייל מוגבל באורכו. טקסט ארוך מועתק ללוח, ומדביקים אותו בגוף המייל
    const short = full.length <= 1500;
    if (!short) await copy();
    const bodyText = short ? full : `${title}\n\n[הטקסט המלא הועתק. יש להדביק אותו כאן: Ctrl+V]`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    if (!short) flash('הטקסט המלא הועתק. הדביקי אותו בגוף המייל.');
  };

  return (
    <div className="fade-in">
      <div className="no-print mb-3 flex flex-wrap items-center gap-1">
        <span className="flex-1 text-sm font-semibold">{name}</span>
        <button className="btn w-20 px-2 py-1 text-xs" onClick={() => window.print()} title="מדפיס רק את הטקסט שבלוח הזה">
          הדפסה
        </button>
        <button className="btn w-20 px-2 py-1 text-xs" onClick={copy}>
          העתקה
        </button>
        <button className="btn w-24 px-2 py-1 text-xs" onClick={mail}>
          שליחה במייל
        </button>
        <button className="btn w-16 px-2 py-1 text-xs" onClick={() => setPanel(null)}>
          סגירה
        </button>
        <span className="w-full text-xs text-done" aria-live="polite">
          {msg}
        </span>
      </div>
      <div ref={body} className="print-area">
        <p className="hidden text-xs text-ink/60 print:block">תוכנית בינוי, הרובע המיוחד אשדוד. {name}.</p>
        <h2 className="text-2xl font-light leading-snug">{title}</h2>
        {lead && <p className="mt-2 text-sm leading-relaxed text-ink/80">{lead}</p>}
        {children}
      </div>
    </div>
  );
}
