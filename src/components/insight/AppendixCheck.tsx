import { useMemo } from 'react';
import { EXISTING_TREES } from '../../data/existingTrees';
import { funnelHits } from '../../data/heliData';
import { PUBLIC } from '../../data/publicData';
import { QUARTER } from '../../data/quarterData';
import { usePlanStore } from '../../store/planStore';
type Ring = [number, number][];

const inRing = (r: Ring, x: number, y: number) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  }
  return c;
};
const n1 = (v: number) => v.toLocaleString('he-IL', { maximumFractionDigits: 1 });

/** הפרוגרמה: צורך לפי המסמך (2,950 יח"ד), הקצאה מומלצת, וצורך מעודכן ל-3,544 יח"ד */
export const PROGRAM = {
  unitsOld: 2950,
  unitsNew: 3544,
  rows: [
    { name: 'מעונות יום', count: 3, unit: 'מעונות', need: 3, alloc: 1 },
    { name: 'גני ילדים', count: 24, unit: 'כיתות', need: 12, alloc: 9.6 },
    { name: 'בית ספר יסודי', count: 51, unit: 'כיתות', need: 20.4, alloc: 16.8 },
    { name: 'בית ספר על-יסודי', count: 51, unit: 'כיתות', need: 25.5, alloc: 21 },
    { name: 'מרכז קהילתי ומועדון', count: 1, unit: 'מרכז', need: 0, alloc: 1 },
    { name: 'בתי כנסת', count: 3.5, unit: 'בתי כנסת', need: 1, alloc: 1 },
    { name: 'מקווה', count: 1, unit: 'מקווה', need: 0.5, alloc: 0.5 },
  ],
  needTotal: 62.5,
  allocTotal: 51.9,
};

function Box({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-r-2 border-ink bg-white p-3">
      <p className="text-xs font-semibold">{title}</p>
      {children}
      <p className="mt-2 text-xs leading-relaxed text-ink/50">{note}</p>
    </div>
  );
}

function Trees() {
  const selectLot = usePlanStore((s) => s.selectLot);
  const { hits, count } = useMemo(() => {
    const count = { keep: 0, move: 0, cut: 0 };
    const by = new Map<string, { keep: number; other: number }>();
    for (const [x, y, k] of EXISTING_TREES) {
      count[k]++;
      const lot = QUARTER.lots.find((l) => inRing(l.ring, x, y));
      if (!lot) continue;
      const e = by.get(lot.num) ?? { keep: 0, other: 0 };
      if (k === 'keep') e.keep++;
      else e.other++;
      by.set(lot.num, e);
    }
    return { hits: [...by].sort((a, b) => b[1].keep - a[1].keep), count };
  }, []);
  return (
    <Box
      title="בדיקה מול המודל: עצים בתוך מגרשי המגורים"
      note="העצים זוהו אוטומטית מהגיליון לפי צבע הסימון, 174 מתוך כ-179, בדיוק מיקום של כ-2 עד 3 מ'. עץ שעל גבול מגרש עלול להיספר בצד הלא נכון."
    >
      <p className="mt-1 text-sm">
        זוהו {count.keep} עצים לשימור, {count.move} להעתקה ו-{count.cut} לכריתה.
      </p>
      {hits.length === 0 ? (
        <p className="mt-1 text-sm">אף עץ לא נמצא בתוך מגרש מגורים.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm">
          {hits.map(([num, e]) => (
            <li key={num}>
              <button title="הצגת המגרש במודל" className="font-semibold underline decoration-ink/30 underline-offset-4" onClick={() => selectLot(num)}>
                מגרש {num}
              </button>
              : {e.keep} לשימור{e.other ? `, ${e.other} להעתקה או לכריתה` : ''}.
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}

function Heli() {
  const selectLot = usePlanStore((s) => s.selectLot);
  const hits = useMemo(funnelHits, []);
  return (
    <Box
      title="בדיקה מול המודל: מעטפת הזכויות מול משפך הגישה"
      note="הערכה ולא קביעה. המפלסים H1=+51.6 ו-H2=+90 נקראו מהגיליון, ומהם נגזר מפלס מנחת של 32.0. מפלס הקרקע במגרש נלקח מהקרקע הקיימת, ולא ממפלס הכניסה הקובעת. מישורי המעבר שבצדי המשפך לא נבדקו. דיוק העיגון: מטרים בודדים. נדרש אישור של יועץ תעופה."
    >
      {hits.length === 0 ? (
        <p className="mt-1 text-sm">אף מגרש מגורים אינו מתחת למשפך.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-sm">
          {hits.map((h) => (
            <li key={h.num}>
              <button title="הצגת המגרש במודל" className="font-semibold underline decoration-ink/30 underline-offset-4" onClick={() => selectLot(h.num)}>
                מגרש {h.num}
              </button>
              : ראש הבניין במפלס {n1(h.top)}, המותר בקצה הקרוב {n1(h.allowed)}.{' '}
              <span className={h.over >= 5 ? 'bg-[#F4E9A8] px-1 font-semibold' : ''}>{Math.abs(h.over) < 5 ? `גבולי: הפרש של כ-${Math.round(h.over)} מ', בתוך טווח הטעות` : h.over > 0 ? `חריגה אפשרית של כ-${Math.round(h.over)} מ'` : `מרווח של כ-${Math.round(-h.over)} מ'`}</span>
              , ב-{Math.round(h.share * 100)}% מהמגרש.
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}

function Program() {
  const k = PROGRAM.unitsNew / PROGRAM.unitsOld;
  const publicArea = PUBLIC.lots.filter((l) => l.kind === 'public').reduce((s, l) => s + (l.areaTable ?? l.areaDrawn), 0) / 1000;
  return (
    <Box
      title={`פרוגרמה מעודכנת ל-${PROGRAM.unitsNew.toLocaleString('he-IL')} יח"ד`}
      note={`הצורך המעודכן הוא הערכה: הכפלה ישרה ביחס יחידות הדיור (${n1(k)}), בלי לשנות את גודל משק הבית או את השנתון. הפרוגרמה אינה משייכת מוסדות למגרשים, ולכן השיוך נשאר פתוח. נדרשת פרוגרמה מעודכנת של היחידה לתכנון אסטרטגי.`}
    >
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="border-b border-ink/20 text-right text-ink/60">
            <th className="py-1 font-normal">מוסד</th>
            <th className="font-normal">במסמך</th>
            <th className="font-normal">מעודכן</th>
            <th className="font-normal">צורך, ד'</th>
            <th className="font-normal">מעודכן, ד'</th>
            <th className="font-normal">הקצאה, ד'</th>
          </tr>
        </thead>
        <tbody>
          {PROGRAM.rows.map((r) => (
            <tr key={r.name} className="border-b border-ink/10">
              <td className="py-1 font-semibold">{r.name}</td>
              <td>
                {n1(r.count)} {r.unit}
              </td>
              <td>{n1(Math.ceil(r.count * k))}</td>
              <td>{r.need ? n1(r.need) : 'משולב'}</td>
              <td>{r.need ? n1(r.need * k) : 'משולב'}</td>
              <td>{n1(r.alloc)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-1">סך הכול</td>
            <td />
            <td />
            <td>{n1(PROGRAM.needTotal)}</td>
            <td>{n1(PROGRAM.needTotal * k)}</td>
            <td>{n1(PROGRAM.allocTotal)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-sm">
        מגרשי "מבנים ומוסדות ציבור" שבמודל: <span className="font-semibold">{n1(publicArea)} דונם</span>. הצורך המעודכן:{' '}
        <span className="bg-[#F4E9A8] px-1 font-semibold">{n1(PROGRAM.needTotal * k)} דונם</span>.
      </p>
    </Box>
  );
}

export default function AppendixCheck({ id }: { id: string }) {
  if (id === 'trees') return <Trees />;
  if (id === 'heli') return <Heli />;
  if (id === 'program') return <Program />;
  return null;
}
