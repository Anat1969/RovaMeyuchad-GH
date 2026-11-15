import { useState } from 'react';
import { RULES } from '../../data/rules';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import { IconBtn } from '../ui/Icon';
import Tag from '../ui/Tag';
import { streetName, streetSpot, type StreetKey } from '../viewport/spots';

type Kind = 'walk' | 'trees' | 'bike' | 'park' | 'road' | 'median';
interface Strip {
  k: Kind;
  w: number;
}
const NAME: Record<Kind, string> = { walk: 'הליכה', trees: 'עצים ושירות', bike: 'אופניים', park: 'חנייה', road: 'מיסעה', median: 'אי תנועה' };

/** חלוקה מוצעת של זכות הדרך, מקצה לקצה. רוחב זכות הדרך מנספח התנועה, והחלוקה פנימה היא הצעה */
const half = (walk: number, trees: number, bike: number, park: number): Strip[] =>
  [
    { k: 'walk' as Kind, w: walk },
    { k: 'trees' as Kind, w: trees },
    { k: 'bike' as Kind, w: bike },
    { k: 'park' as Kind, w: park },
  ].filter((s) => s.w > 0);
const mirror = (h: Strip[], road: Strip[], h2 = h): Strip[] => [...h, ...road, ...[...h2].reverse()];
const SECTIONS: { w: number; name: string; strips: Strip[] }[] = [
  { w: 14, name: 'רחוב מגורים צר', strips: mirror(half(2.55, 1.2, 0, 0), [{ k: 'road', w: 6.5 }]) },
  { w: 17, name: 'רחוב מגורים', strips: mirror(half(2.85, 1.2, 0, 2.4), [{ k: 'road', w: 6.5 }], half(2.85, 1.2, 0, 0)) },
  { w: 23, name: 'רחוב מאסף', strips: mirror(half(3, 1.5, 3, 2.25), [{ k: 'road', w: 6.5 }], half(3, 1.5, 0, 2.25)) },
  { w: 28, name: 'רחוב מאסף רחב', strips: mirror(half(4, 2, 2.25, 2.5), [{ k: 'road', w: 6.5 }]) },
  { w: 36, name: 'רחוב ראשי', strips: mirror(half(4, 2, 2.5, 2.5), [{ k: 'road', w: 6.5 }, { k: 'median', w: 1 }, { k: 'road', w: 6.5 }]) },
  { w: 42, name: 'שדרה', strips: mirror(half(4.5, 2.5, 2.5, 2.5), [{ k: 'road', w: 6.5 }, { k: 'median', w: 5 }, { k: 'road', w: 6.5 }]) },
];

const Tree = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <g>
    <line x1={x} y1={y} x2={x} y2={y - 5 * s} stroke="#5B4A2E" strokeWidth={0.35 * s} />
    <circle cx={x} cy={y - 6.5 * s} r={3 * s} fill="#4A7C59" fillOpacity={0.85} />
  </g>
);
const Person = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <g stroke="#2E2E2B" strokeWidth={0.18 * s} fill="none">
    <circle cx={x} cy={y - 1.55 * s} r={0.14 * s} fill="#2E2E2B" />
    <path d={`M${x} ${y - 1.4 * s}V${y - 0.75 * s}M${x} ${y - 0.75 * s}l${-0.25 * s} ${0.75 * s}M${x} ${y - 0.75 * s}l${0.25 * s} ${0.75 * s}`} />
  </g>
);

/** חתך רחוב בקנה מידה, לפי רוחב זכות הדרך, עם צבעי חלופת הריצוף שנבחרה */
export default function SectionPanel() {
  const [i, setI] = useState(2);
  const topics = usePlanStore((s) => s.topics);
  const sec = SECTIONS[i];
  const camTo = usePlanStore((s) => s.camTo);
  const spot: StreetKey = sec.w >= 36 ? 'avenue' : sec.w >= 23 ? 'road8' : 'local';
  const legend = topics.find((t) => t.id === 'paving')?.items.find((i) => i.id === 'paving-main')?.legend ?? [];
  const col = (word: string, fallback: string) => legend.find((l) => l.label.includes(word))?.color ?? fallback;
  const FILL: Record<Kind, string> = {
    walk: col('הליכה', '#CDC0AD'),
    trees: col('שירות', '#E7D8C0'),
    bike: '#B9896B',
    park: col('חני', '#9A9390'),
    road: '#55555A',
    median: '#7CB87C',
  };
  const side = 9; // מטרים של בניין בכל צד
  const total = sec.w + side * 2;
  const s = 640 / total; // פיקסלים למטר
  const gy = 250; // קו הקרקע
  let x = side * s;
  const walkW = sec.strips.filter((t) => t.k === 'walk').reduce((a, t) => Math.min(a, t.w), 99);
  const treeRows = sec.strips.filter((t) => t.k === 'trees' || (t.k === 'median' && t.w >= 3)).length;
  const green = sec.strips.filter((t) => t.k === 'trees' || t.k === 'median').reduce((a, t) => a + t.w, 0);

  return (
    <PanelShell
      name="חתך רחוב"
      title={`${sec.name}: זכות דרך של ${sec.w} מ', ${treeRows} שורות עצים`}
      lead="חתך בקנה מידה, לפי רוחב זכות הדרך. הצבעים הם של חלופת הריצוף שנבחרה בנושא הריצוף, והעצים, הפתחים והתאורה לפי דרישות האוגדן."
    >
      <div className="no-print mt-4 grid grid-cols-6 gap-1">
        {SECTIONS.map((t, k) => (
          <button key={t.w} title={t.name} aria-pressed={k === i} onClick={() => setI(k)} className={`btn px-1 py-1.5 text-xs ${k === i ? 'btn-on' : ''}`}>
            {t.w} מ'
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm leading-relaxed">
        <Tag s={1} /> רוחב זכות הדרך, {sec.w} מ': <span className="text-ink/60">נספח תנועה וחניה, 3/124/03/3.</span>
        <br />
        <Tag s={3} text="הצעה" /> החלוקה לרצועות: <span className="text-ink/60">הצעה של האפליקציה, לפי אוגדן שפת הרחוב, אוגדן ההיתר ותדריך הזקנה. זה אינו חתך מהנספח ואינו חתך מהמצגת.</span>
      </p>
      <div className="no-print mt-2 flex items-center gap-2">
        <IconBtn icon="show" label="מעבר לרחוב כזה במודל" onClick={() => (({ pos, target }) => camTo(pos, target))(streetSpot(spot))} />
        <span className="text-xs text-ink/60">במודל: {streetName(spot)}. השיוך לפי סיווג הרחוב, כי שיוך החתכים לרחובות לא נקרא מהנספח.</span>
      </div>

      <svg viewBox="0 0 640 330" className="mt-4 w-full" role="img" aria-label={`חתך רחוב ברוחב ${sec.w} מטרים`} direction="ltr">
        <rect x={0} y={gy - 22 * s} width={side * s} height={22 * s} fill="#EDE7DD" stroke="#2E2E2B" strokeWidth={0.6} />
        <rect x={640 - side * s} y={gy - 22 * s} width={side * s} height={22 * s} fill="#EDE7DD" stroke="#2E2E2B" strokeWidth={0.6} />
        {[...Array(6)].map((_, f) => (
          <g key={f} stroke="#2E2E2B" strokeOpacity={0.25} strokeWidth={0.5}>
            <line x1={0} x2={side * s} y1={gy - (f + 1) * 3.4 * s} y2={gy - (f + 1) * 3.4 * s} />
            <line x1={640 - side * s} x2={640} y1={gy - (f + 1) * 3.4 * s} y2={gy - (f + 1) * 3.4 * s} />
          </g>
        ))}
        {sec.strips.map((t, k) => {
          const x0 = x;
          const w = t.w * s;
          x += w;
          const mid = x0 + w / 2;
          const raised = t.k === 'road' || t.k === 'park' ? 0 : 0.15 * s;
          return (
            <g key={k}>
              <rect x={x0} y={gy - raised} width={w} height={6 + raised} fill={FILL[t.k]} stroke="#2E2E2B" strokeWidth={0.4} />
              {(t.k === 'trees' || (t.k === 'median' && t.w >= 3)) && <Tree x={mid} y={gy - raised} s={s} />}
              {t.k === 'trees' && <line x1={x0 + 0.3 * s} y1={gy} x2={x0 + 0.3 * s} y2={gy - 8 * s} stroke="#2E2E2B" strokeWidth={0.9} />}
              {t.k === 'walk' && <Person x={mid} y={gy - raised} s={s} />}
              {t.k === 'bike' && <circle cx={mid} cy={gy - raised - 0.45 * s} r={0.4 * s} fill="none" stroke="#2E2E2B" strokeWidth={0.7} />}
              {(t.k === 'road' || t.k === 'park') && w > 22 && (
                <rect x={mid - 0.9 * s} y={gy - 1.45 * s} width={1.8 * s} height={1.3 * s} rx={0.3 * s} fill="none" stroke="#2E2E2B" strokeWidth={0.7} />
              )}
              <line x1={x0} x2={x0} y1={gy + 12} y2={gy + 22} stroke="#2E2E2B" strokeWidth={0.5} />
              <text x={mid} y={gy + 21} textAnchor="middle" fontSize={w < 18 ? 9 : 11} fill="#2E2E2B">
                {t.w}
              </text>
              <text x={mid} y={gy + 34} textAnchor="middle" fontSize={9} fill="#2E2E2B" fillOpacity={0.7} transform={w < 30 ? `rotate(-55 ${mid} ${gy + 34})` : undefined} style={{ direction: 'rtl' }}>
                {NAME[t.k]}
              </text>
            </g>
          );
        })}
        <line x1={side * s} x2={640 - side * s} y1={gy + 62} y2={gy + 62} stroke="#2E2E2B" strokeWidth={0.7} />
        <text x={320} y={gy + 76} textAnchor="middle" fontSize={10} fontWeight={600} fill="#2E2E2B" style={{ direction: 'rtl' }}>
          זכות דרך {sec.w} מ'
        </text>
      </svg>

      <ol className="mt-4 space-y-2">
        {[
          {
            t: walkW >= 2 ? `רצועת ההליכה: ${walkW} מ' נטו.` : `רצועת ההליכה צרה מדי: ${walkW} מ'.`,
            d: "רוחב נטו של 2 מ' לפחות מאפשר לשני כיסאות גלגלים או לשתי עגלות לחלוף זה על פני זה.",
          },
          {
            t: `${treeRows} שורות עצים, כל ${RULES.treeSpacing.v} מ', בפתח נטיעה של ${RULES.pit.v[1]} על ${RULES.pit.v[0]} מ'.`,
            d: `רצועות העצים והגינון תופסות ${green.toFixed(1)} מ' מתוך ${sec.w}, כלומר ${Math.round((green / sec.w) * 100)}% מזכות הדרך.`,
          },
          {
            t: sec.strips.some((t) => t.k === 'bike') ? 'שביל האופניים מופרד מרצועת ההליכה ברצועת העצים.' : 'אין שביל אופניים נפרד ברוחב הזה.',
            d: sec.strips.some((t) => t.k === 'bike') ? 'כך דורשים תדריך הזקנה ושכונה 360°. בפרטים הנופיים של התב"ע השביל צמוד למדרכה.' : 'ברחוב צר האופניים משתלבים במיסעה, ולכן נדרש מיתון תנועה.',
          },
        ].map((r, k) => (
          <li key={k} className="grid grid-cols-[2.2rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
            <span className="text-3xl font-light leading-none text-ink/35">{k + 1}</span>
            <div>
              <p className="text-base leading-snug">{r.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/75">{r.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs leading-relaxed text-ink/50">
        רוחבי זכות הדרך לקוחים מנספח התנועה של 3/124/03/3. החלוקה הפנימית לרצועות היא הצעה לדיון, ולא החתכים שבנספח. גובה הבניינים בחתך סמלי.
      </p>
    </PanelShell>
  );
}
