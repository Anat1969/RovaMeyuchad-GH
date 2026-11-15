import { PUBLIC } from '../../data/publicData';
import { KIND } from '../../data/publicKinds';
import { DESIGNS } from '../../data/designData';
import type { PlanTopic, PublicKind, PublicLot, SpecItem } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import { IconBtn } from '../ui/Icon';
import SpecLegend from './SpecLegend';
import SpecStatutory from './SpecStatutory';

const fmt = (n: number) => Math.round(n).toLocaleString('he-IL');
const area = (l: PublicLot) => l.areaTable ?? l.areaDrawn;
/** שטח עיקרי מותר מעל הקרקע, במ"ר */
const mainOf = (l: PublicLot) => l.mainArea ?? (l.main ? (area(l) * l.main) / 100 + (l.dormArea ?? 0) : 0);
/** נפח מעטפת הזכויות: תכסית כפול גובה */
const volumeOf = (l: PublicLot) => (l.coverage && l.height ? ((area(l) * l.coverage) / 100) * l.height : 0);

function LotCard({ lot, list }: { lot: PublicLot; list: PublicLot[] }) {
  const selectLot = usePlanStore((s) => s.selectLot);
  const i = list.findIndex((l) => l.num === lot.num);
  const step = (d: number) => selectLot(list[(i + d + list.length) % list.length].num);
  const meta = KIND[lot.kind];
  const design = DESIGNS.find((d) => d.lot === lot.num);
  const rows: [string, string][] = [['ייעוד', meta.name]];
  if (lot.areaTable) rows.push(['שטח המגרש בטבלה', `${fmt(lot.areaTable)} מ"ר`]);
  rows.push(['שטח לפי שרטוט החלקות', `${fmt(lot.areaDrawn)} מ"ר`]);
  if (meta.built) {
    rows.push(['שטח עיקרי מעל הקרקע', lot.main ? `${lot.main}%, כ-${fmt(mainOf(lot))} מ"ר` : `${fmt(mainOf(lot))} מ"ר`]);
    if (lot.total) rows.push(['אחוזי בנייה כוללים', `${lot.total}%`]);
    rows.push(['תכסית', `${lot.coverage}%`]);
    rows.push(['גובה מרבי', `${lot.height} מ'`]);
    rows.push(['קומות מעל הכניסה', `${lot.floors}`]);
    if (lot.below) rows.push(['קומות מתחת לכניסה', `${lot.below}`]);
    if (lot.units) rows.push(['יחידות מעונות', fmt(lot.units)]);
    rows.push(['נפח מעטפת הזכויות', `כ-${fmt(volumeOf(lot))} מ"ק`]);
    rows.push(['מודל התכנון של האדריכל', design ? design.name : 'לא הועלה']);
  }
  const gap = lot.areaTable ? Math.abs(lot.areaDrawn - lot.areaTable) / lot.areaTable : 0;

  return (
    <section className="flash-once sticky top-0 z-10 mb-4 bg-[#F3F2F1] p-3 shadow-md" key={lot.num} style={{ ['--flash' as string]: `${meta.color}55` }}>
      <div className="mb-2 flex items-center gap-1">
        <h3 className="flex-1 text-xl font-light">
          תא שטח <span className="font-semibold">{lot.num}</span>
        </h3>
        <IconBtn icon="prev" label="המגרש הקודם" onClick={() => step(-1)} />
        <IconBtn icon="next" label="המגרש הבא" onClick={() => step(1)} />
        <IconBtn icon="close" label="סגירת הכרטיס" onClick={() => selectLot(null)} />
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink/60">{k}</dt>
            <dd className="text-left font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {gap > 0.05 && (
        <p className="mt-2 bg-wait/[0.1] p-2 text-xs leading-relaxed">
          שטח המגרש בשרטוט שונה ב-{Math.round(gap * 100)}% מהשטח בטבלת הזכויות. ייתכן שהחלוקה עודכנה מאז. לאמת מול המתכננים.
        </p>
      )}
      {lot.note && <p className="mt-2 bg-wait/[0.1] p-2 text-xs leading-relaxed">{lot.note}</p>}
    </section>
  );
}

const GROUPS: PublicKind[] = ['public', 'education', 'dorms', 'mixed', 'facility', 'open', 'forest', 'openland'];

export default function PublicPanel({ topic, item }: { topic: PlanTopic; item: SpecItem }) {
  const selectedLot = usePlanStore((s) => s.selectedLot);
  const selectLot = usePlanStore((s) => s.selectLot);
  const massMode = usePlanStore((s) => s.massMode);
  const lots = PUBLIC.lots;
  const list = GROUPS.flatMap((k) => lots.filter((l) => l.kind === k));
  const built = lots.filter((l) => KIND[l.kind].built);
  const civic = lots.filter((l) => l.kind === 'public' || l.kind === 'education');
  const lot = lots.find((l) => l.num === selectedLot);
  const maxMain = Math.max(...built.map(mainOf));
  const withDesign = built.filter((l) => DESIGNS.some((d) => d.lot === l.num)).length;

  return (
    <div>
      {lot && <LotCard lot={lot} list={list} />}
      <h2 className="text-xl font-light leading-snug">
        <span className="font-semibold">{fmt(civic.reduce((s, l) => s + mainOf(l), 0))}</span> מ"ר שטח עיקרי ב-<span className="font-semibold">{civic.length}</span> מגרשי
        ציבור וחינוך
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/75">
        על <span className="font-semibold">{(civic.reduce((s, l) => s + area(l), 0) / 1000).toFixed(1)}</span> דונם. לצידם: שני מגרשי מעונות, שני מגרשי מסחר ותעסוקה,
        ושישה שטחים ציבוריים פתוחים.
      </p>
      <p className="mt-2 bg-ink/[0.04] p-2 text-sm leading-relaxed">
        <span className="font-semibold">{massMode === 'rights' ? 'מוצג: מודל הזכויות.' : 'מוצג: מודל התכנון.'}</span>{' '}
        {massMode === 'rights'
          ? 'כל מסה היא המעטפת המרבית שהתב"ע מתירה: תכסית כפול גובה. זה אינו תכנון.'
          : `מודל אדריכל קיים ל-${withDesign} מתוך ${built.length} מגרשים. לשאר מוצג רק קו המעטפת המותרת.`}
      </p>

      <SpecLegend item={item} />

      <section className="mt-5">
        <h3 className="text-xs font-semibold text-ink/60">תאי השטח, לפי ייעוד</h3>
        <p className="mb-2 text-xs text-ink/45">אורך הפס: השטח העיקרי המותר מעל הקרקע. לחיצה בוחרת את המגרש במודל.</p>
        {GROUPS.map((k) => {
          const group = lots.filter((l) => l.kind === k);
          if (!group.length) return null;
          return (
            <div key={k} className="mb-2">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <span className="h-2.5 w-2.5" style={{ background: KIND[k].color }} />
                {KIND[k].name}
              </p>
              <ul>
                {group.map((l) => {
                  const on = l.num === selectedLot;
                  return (
                    <li key={l.num}>
                      <button
                        onClick={() => selectLot(on ? null : l.num)}
                        aria-pressed={on}
                        className={`grid w-full grid-cols-[3.6rem_1fr_9rem] items-center gap-2 px-1 py-[0.2rem] text-right text-xs ${on ? 'bg-ink text-white' : 'hover:bg-ink/[0.06]'}`}
                      >
                        <span className="font-semibold">{l.num}</span>
                        <span className="block h-2 bg-ink/[0.06]">
                          {KIND[k].built && <span className="block h-full" style={{ width: `${(mainOf(l) / maxMain) * 100}%`, background: KIND[k].color }} />}
                        </span>
                        <span className={on ? 'text-white/80' : 'text-ink/60'}>
                          {KIND[k].built ? `${fmt(mainOf(l))} מ"ר, עד ${l.height} מ'` : `${fmt(area(l))} מ"ר`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <SpecStatutory topic={topic} />
      <p className="mt-4 text-xs leading-relaxed text-ink/45">
        מקורות: הגיאומטריה משרטוט "חלקות חדשות" (21.7.2026), שכבת תאי השטח. הזכויות מטבלת ההוראות של תכנית 3/124/03/3, שנקראה מסריקה. מספרי תאי השטח שויכו
        למצולעים מול תשריט המצב המאושר.
      </p>
    </div>
  );
}
