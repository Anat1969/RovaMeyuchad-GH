import { useMemo, useState } from 'react';
import { QUARTER } from '../../data/quarterData';
import type { PlanTopic, QuarterLot, SpecItem } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import SpecLegend from './SpecLegend';
import SpecStatutory from './SpecStatutory';

type SortKey = 'num' | 'height' | 'units';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'num', label: 'מספר מגרש' },
  { id: 'height', label: 'גובה' },
  { id: 'units', label: 'יחידות דיור' },
];

const fmt = (n: number | null) => (n === null ? 'לא צוין' : n.toLocaleString('he-IL'));

function LotCard({ lot, list }: { lot: QuarterLot; list: QuarterLot[] }) {
  const selectLot = usePlanStore((s) => s.selectLot);
  const i = list.findIndex((l) => l.num === lot.num);
  const step = (d: number) => selectLot(list[(i + d + list.length) % list.length].num);
  const rows: [string, string][] = [
    ['שימוש', lot.mixed ? 'מגורים מעל חזית מסחרית' : 'מגורים בלבד'],
    ['שטח המגרש', `${fmt(lot.lotArea)} מ"ר`],
    ['יחידות דיור, כולל התוספת', fmt(lot.units)],
    ['צפיפות', `${lot.density} יח"ד לדונם`],
    ['קומות מעל הכניסה', fmt(lot.floors)],
    ['גובה מרבי', `${lot.height} מ'`],
    ['תכסית', `${lot.coverage}%`],
    ['שטח עיקרי למגורים', `${fmt(lot.mainArea)} מ"ר`],
  ];
  if (lot.commerceMain) rows.push(['שטח עיקרי למסחר', `${fmt(lot.commerceMain)} מ"ר`]);

  return (
    <section className="flash-once sticky top-0 z-10 mb-4 bg-[#F3F2F1] p-3 shadow-md" key={lot.num} style={{ ['--flash' as string]: '#D98A3D55' }}>
      <div className="mb-2 flex items-center gap-1">
        <h3 className="flex-1 text-xl font-light">
          מגרש <span className="font-semibold">{lot.num}</span>
        </h3>
        <button className="btn w-16 px-2 py-1 text-xs" onClick={() => step(-1)}>
          הקודם
        </button>
        <button className="btn w-16 px-2 py-1 text-xs" onClick={() => step(1)}>
          הבא
        </button>
        <button className="btn px-2 py-1 text-xs" onClick={() => selectLot(null)}>
          סגירה
        </button>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink/60">{k}</dt>
            <dd className="text-left font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function QuarterPanel({ topic, item }: { topic: PlanTopic; item: SpecItem }) {
  const selectedLot = usePlanStore((s) => s.selectedLot);
  const selectLot = usePlanStore((s) => s.selectLot);
  const [sort, setSort] = useState<SortKey>('num');
  const lots = QUARTER.lots;

  const list = useMemo(() => {
    const l = [...lots];
    if (sort === 'height') l.sort((a, b) => b.height - a.height || a.num.localeCompare(b.num));
    if (sort === 'units') l.sort((a, b) => b.units - a.units || a.num.localeCompare(b.num));
    return l;
  }, [lots, sort]);

  const units = lots.reduce((s, l) => s + l.units, 0);
  const maxFloors = Math.max(...lots.map((l) => l.floors));
  const maxH = Math.max(...lots.map((l) => l.height));
  const maxUnits = Math.max(...lots.map((l) => l.units));
  const area = lots.reduce((s, l) => s + l.calcArea, 0);
  const lot = lots.find((l) => l.num === selectedLot);

  return (
    <div>
      {lot && <LotCard lot={lot} list={list} />}

      <h2 className="text-xl font-light leading-snug">
        <span className="font-semibold">{fmt(units)}</span> יחידות דיור ב-<span className="font-semibold">{lots.length}</span>{' '}
        מגרשים, עד <span className="font-semibold">{maxFloors}</span> קומות
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/75">
        התכנית מוסיפה עד <span className="font-semibold">20%</span> יחידות דיור בכל מגרש, בלי להגדיל את שטחי הבנייה.
        שטח התכנית: <span className="font-semibold">{(area / 1000).toFixed(1)}</span> דונם.
      </p>
      <p className="mt-1 text-xs text-ink/45">מקור: {item.specRef}, וקובצי הגיאומטריה של התכנית.</p>

      <SpecLegend item={item} />

      <section className="mt-5">
        <div className="mb-1 flex items-center gap-1">
          <h3 className="flex-1 text-xs font-semibold text-ink/60">המגרשים, לפי {SORTS.find((s) => s.id === sort)!.label}</h3>
          {SORTS.map((s) => (
            <button
              key={s.id}
              aria-pressed={sort === s.id}
              className={`btn w-20 px-1 py-1 text-[0.7rem] ${sort === s.id ? 'btn-on' : ''}`}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-ink/45">
          אורך הפס: {sort === 'units' ? 'מספר יחידות הדיור' : 'הגובה המרבי במטרים'}. לחיצה בוחרת את המגרש במודל.
        </p>
        <ul>
          {list.map((l) => {
            const on = l.num === selectedLot;
            const share = sort === 'units' ? l.units / maxUnits : l.height / maxH;
            return (
              <li key={l.num}>
                <button
                  onClick={() => selectLot(on ? null : l.num)}
                  aria-pressed={on}
                  className={`grid w-full grid-cols-[2.6rem_1fr_6.5rem] items-center gap-2 px-1 py-[0.2rem] text-right text-xs ${
                    on ? 'bg-ink text-white' : 'hover:bg-ink/[0.06]'
                  }`}
                >
                  <span className="font-semibold">{l.num}</span>
                  <span className="block h-2 bg-ink/[0.06]">
                    <span
                      className="block h-full"
                      style={{ width: `${share * 100}%`, background: l.mixed ? '#D98A3D' : '#E9B77E' }}
                    />
                  </span>
                  <span className={on ? 'text-white/80' : 'text-ink/60'}>
                    {sort === 'units' ? `${l.units} יח"ד` : `${l.height} מ', ${l.floors} קומות`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <SpecStatutory topic={topic} />
      <p className="mt-4 text-xs leading-relaxed text-ink/45">
        המסות במודל סכמטיות: המגרש מוקטן לאחוז התכסית ומוגבה לגובה המרבי. במגרש עם חזית מסחרית, תכסית המגדל (35%)
        היא הנחה. העמדת הבניינים בפועל תיקבע בתכנית הבינוי.
      </p>
    </div>
  );
}
