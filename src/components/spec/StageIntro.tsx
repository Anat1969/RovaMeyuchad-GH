import { STAGES } from '../../data/stages';
import { usePlanStore } from '../../store/planStore';

const STEPS: Record<number, string[]> = {
  1: [
    'פותחים את "שכבות התב"ע", ובונים את המודל שכבה שכבה: טופוגרפיה, ייעודי קרקע, דרכים, זכויות, מגבלות, עצים וניקוז.',
    'ב"בינוי וזכויות" וב"מבני ציבור": הזכויות של כל מגרש, והמעטפת המרבית שלו.',
    'בשלב הזה מוצג רק מה שהתב"ע קובעת. שכבות התכנון של האדריכל מוסתרות.',
  ],
  2: [
    'אוכלוסיות: האם המרחב מתאים לזקנים ולילדים.',
    '44 מדדים: מה יש, מה צריך להתאים ומה חסר, לפי שכונה 360°.',
    'הצללות, רוח, ניקוז וחום: ניתוחים על המודל, עם המלצות לתכנון.',
  ],
  3: [
    'נושאי הפיתוח של תוכנית הבינוי, כל אחד כשכבה על הרחובות.',
    'בנושא הריצוף: החלופות של צוות התכנון. בחירה בחלופה צובעת את המודל.',
    'חתך רחוב בקנה מידה, לפי רוחב זכות הדרך.',
  ],
  4: [
    'תב"ע מול תכנון: איפה תוכנית הבינוי סוטה מהתב"ע, ומה חסר בה.',
    'הכנה לישיבה, יתרונות וחסרונות, הצעות לייעול ותוכנית עבודה.',
    'שליחה לאדריכל: מכתב הערות, עם המסמכים להורדה ולצירוף.',
  ],
};

/** מסך הפתיחה של כל שלב: מה השלב, ומה עושים בו */
export default function StageIntro() {
  const id = usePlanStore((s) => s.stage);
  const setStage = usePlanStore((s) => s.setStage);
  const st = STAGES[id - 1];
  return (
    <div className="fade-in">
      <p className="text-xs text-ink/50">שלב {st.id} מתוך 4</p>
      <h2 className="mt-1 text-2xl font-light leading-snug">
        <span className="font-semibold" style={{ color: st.color }}>
          {st.name}
        </span>
        : {st.hint}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{st.what}</p>
      <ol className="mt-4 space-y-2">
        {STEPS[id].map((t, i) => (
          <li key={i} className="grid grid-cols-[2.2rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
            <span className="text-3xl font-light leading-none text-ink/35">{i + 1}</span>
            <p className="text-sm leading-relaxed">{t}</p>
          </li>
        ))}
      </ol>
      <h3 className="mt-6 text-sm font-semibold">מהלך העבודה</h3>
      <ol className="mt-2 grid grid-cols-4 gap-1">
        {STAGES.map((s) => (
          <li key={s.id}>
            <button title={s.hint} onClick={() => setStage(s.id)} className="w-full p-2 text-right text-xs leading-snug hover:shadow-md" style={{ background: s.id === id ? s.color : `${s.color}1A`, color: s.id === id ? '#fff' : undefined }}>
              <span className="block text-lg font-light leading-none opacity-60">{s.id}</span>
              <span className="font-semibold">{s.name}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-ink/50">
        צבע התווית מבחין בין סוגי המידע: כחול למידע סטטוטורי, ירוק לצרכים, חום לתכנון האדריכל, ושחור להערות. ליד כל שכבה ולוח רשום המסמך שממנו נלקח המידע.
      </p>
    </div>
  );
}
