import { useRef, useState, type ReactNode } from 'react';
import { usePlanStore } from '../../store/planStore';
import { IconBtn } from '../ui/Icon';
import Tag from '../ui/Tag';

/**
 * מעטפת לכל לוח תובנות: כותרת, פעולות (הדפסה, העתקה, מייל) ותוכן.
 * הטקסט לשליחה נלקח מהתוכן עצמו, כך שמה שמודפס ומה שנשלח זהים למה שמוצג.
 */
export default function PanelShell({
  name,
  title,
  lead,
  children,
  onClose,
}: {
  name: string;
  title: string;
  lead?: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  const setPanel = usePlanStore((s) => s.setPanel);
  const stageId = usePlanStore((s) => s.stage);
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
    // Gmail בלשונית חדשה: קישור mailto לא נפתח בדפדפן שלא הוגדרה בו תוכנת מייל
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`, '_blank', 'noopener');
    if (!short) flash('הטקסט המלא הועתק. הדביקי אותו בגוף המייל.');
  };

  return (
    <div className="fade-in">
      <div className="no-print mb-3 flex flex-wrap items-center gap-1">
        <span className="flex-1 text-sm font-semibold">
          <Tag s={stageId} /> {name}
        </span>
        <IconBtn icon="print" label="הדפסה" onClick={() => window.print()} />
        <IconBtn icon="copy" label="העתקה" onClick={copy} />
        <IconBtn icon="mail" label="פתיחת הודעה ב-Gmail" onClick={mail} />
        <IconBtn icon="close" label="סגירה" onClick={onClose ?? (() => setPanel(null))} />
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
