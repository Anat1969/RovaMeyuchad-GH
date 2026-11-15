import { useState } from 'react';
import { sortedTopics, usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import { IconBtn } from '../ui/Icon';

const fmt = (d: string) => (d ? d.split('-').reverse().join('.') : 'בלי תאריך');

/** תוכנית עבודה למעקב: משימה, נושא ותאריך יעד. נשמרת בדפדפן */
export default function WorkPlan() {
  const topics = usePlanStore((s) => s.topics);
  const tasks = usePlanStore((s) => s.tasks);
  const addTask = usePlanStore((s) => s.addTask);
  const updateTask = usePlanStore((s) => s.updateTask);
  const removeTask = usePlanStore((s) => s.removeTask);
  const go = usePlanStore((s) => s.go);
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('general');
  const [text, setText] = useState('');

  const names: Record<string, string> = { general: 'כללי' };
  sortedTopics(topics).forEach((t) => (names[t.id] = t.nameHe));
  // לפי תאריך יעד. משימות בלי תאריך בסוף
  const list = [...tasks].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const open = tasks.filter((t) => !t.done).length;
  const undated = tasks.filter((t) => !t.done && !t.date).length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <PanelShell
      name="תוכנית עבודה"
      title={`${open} משימות פתוחות, ${undated} מהן בלי תאריך יעד`}
      lead="המשימות נגזרו מהפערים שנמצאו בתוכנית. קבעי לכל אחת תאריך, הוסיפי משלך, ושלחי במייל לצוות התכנון."
    >
      <form
        className="no-print mt-4 grid grid-cols-[9.5rem_1fr] gap-1 bg-ink/[0.04] p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addTask({ date, topic, text: text.trim() });
          setText('');
        }}
      >
        <input type="date" className="field" aria-label="תאריך יעד" value={date} onChange={(e) => setDate(e.target.value)} />
        <select className="field" aria-label="נושא" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {Object.entries(names).map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </select>
        <input className="field col-span-2" placeholder="המשימה: מה צריך לקרות" aria-label="תיאור המשימה" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-on col-span-2" disabled={!text.trim()}>
          הוספת משימה
        </button>
      </form>

      <p className="mt-4 text-xs text-ink/50">המשימות לפי תאריך יעד. סימון בתיבה מסמן שהמשימה בוצעה.</p>
      <ul className="mt-1 space-y-1">
        {list.map((t, i) => {
          const late = !t.done && t.date && t.date < today;
          return (
            <li key={t.id} className={`grid grid-cols-[auto_1fr] items-start gap-2 p-2 ${t.done ? 'bg-done/[0.07]' : 'bg-ink/[0.03]'}`}>
              <input
                type="checkbox"
                className="no-print mt-1 h-4 w-4 accent-[#3F7D55]"
                aria-label="בוצע"
                checked={t.done}
                onChange={(e) => updateTask(t.id, { done: e.target.checked })}
              />
              <div className="min-w-0">
                <p className={`text-sm leading-snug ${t.done ? 'text-ink/50 line-through' : ''}`}>
                  <span className="text-ink/45">{i + 1}. </span>
                  <span className="font-semibold">{names[t.topic] ?? 'כללי'}: </span>
                  {t.text}
                </p>
                <p className={`mt-0.5 text-xs ${late ? 'font-semibold text-red-800' : 'text-ink/55'}`}>
                  תאריך יעד: {fmt(t.date)}
                  {late ? ' (עבר)' : ''}
                  {t.done ? '. בוצע' : ''}
                </p>
                <div className="no-print mt-1 flex items-center gap-1">
                  <input
                    type="date"
                    className="field w-36 py-1 text-xs"
                    aria-label="שינוי תאריך יעד"
                    value={t.date}
                    onChange={(e) => updateTask(t.id, { date: e.target.value })}
                  />
                  {t.topic !== 'general' && (
                    <IconBtn icon="show" label="הצגה במודל" onClick={() => go({ topic: t.topic, view: t.topic === 'massing' ? 'perspective' : 'detail' })} />
                  )}
                  <IconBtn icon="trash" label="מחיקת המשימה" onClick={() => removeTask(t.id)} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}
