import { useEffect, useMemo } from 'react';
import {
  RAMPS,
  SEASON_NAME,
  WIND_DIRS,
  alongStreets,
  heatField,
  mainSlope,
  rampCss,
  shadeFraction,
  sinksInPlan,
  windField,
  flowAt,
  WALK,
  type Analysis,
  type Season,
  designShift,
  yardShade,
  YARD_HOURS,
  effWind,
  windName,
  setSurface,
} from '../../analysis/engine';
import { RULES } from '../../data/rules';
import { usePlanStore } from '../../store/planStore';
import PanelShell from './PanelShell';
import ShowBtn from '../ui/ShowBtn';
import { IconBtn } from '../ui/Icon';
import type { Go } from '../../data/insights';

const NAME: Record<Analysis, string> = { shade: 'הצללות', wind: 'רוח', water: 'ניקוז', heat: 'חום' };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const names = (l: { n: string }[], k = 3) => l.slice(0, k).map((s) => s.n).join(', ');

interface Tip {
  t: string;
  d: string;
  go?: Go;
}

/** מחשב את הממצאים וההמלצות של הניתוח הפעיל */
function useFindings(a: Analysis, season: Season, windFrom: number, design: boolean) {
  return useMemo(() => {
    if (a === 'shade') {
      const morning = alongStreets(shadeFraction(season, 8, 12));
      const day = alongStreets(shadeFraction(season));
      const worst = [...morning.streets].reverse();
      const ok = morning.all * 100 >= RULES.shadeElders.v;
      return {
        title: `${pct(morning.all)} מהמדרכות מוצלות בבוקר, מול יעד של ${RULES.shadeElders.v}%`,
        lead: `ב-${SEASON_NAME[season]}, בין 8:00 ל-12:00. לאורך כל היום: ${pct(day.all)}. הצל מחושב ממעטפות הזכויות ומעץ כל ${RULES.treeSpacing.v} מ', כפי שהאוגדן דורש.`,
        bars: { label: 'שיעור הצל בבוקר, לפי רחוב', list: morning.streets, good: 'high' as const },
        tips: [
          {
            t: ok ? 'היעד מושג בממוצע. לוודא אותו רחוב אחר רחוב.' : `חסרים ${Math.round(RULES.shadeElders.v - morning.all * 100)} נקודות אחוז עד היעד של תדריך הזקנה.`,
            d: `${RULES.shadeElders.text} (${RULES.shadeElders.ref}). מדד 30 בשכונה 360° דורש ${RULES.shade360.v}%.`,
            go: { topic: 'planting', item: 'trees-main' },
          },
          { t: `להוסיף שורת עצים שנייה ברחובות החשופים: ${names(worst)}.`, d: 'ברחובות האלה הצל בבוקר הוא הנמוך ביותר. שורה שנייה, או עצים רחבי נוף במקום ברוש עמודי, משפרים מיד.' },
          { t: 'לדרוש הצללה זמנית עד שהעצים יגדלו.', d: 'החישוב מניח נוף עץ בוגר, ברדיוס של כ-3 מ\'. בשנים הראשונות הצל בפועל קטן בהרבה.' },
          { t: 'לבחור מינים לפי הצל שהם נותנים.', d: 'ברוש עמודי כמעט אינו מצל. ברחובות שרצים מצפון לדרום כדאי חרוב או עץ רחב נוף אחר.', go: { topic: 'planting', item: 'trees-main' } },
        ] as Tip[],
      };
    }
    if (a === 'wind') {
      const f = windField(windFrom);
      const fast = alongStreets(f, (v) => v > 0.7);
      const calm = alongStreets(f, (v) => v < 0.35);
      const dir = windName(windFrom);
      return {
        title: `${pct(fast.all)} מהמדרכות באזור האצת רוח, ${pct(calm.all)} בצל רוח`,
        lead: `רוח מ${dir}. מגדלים של עד 100 מ' מאיצים את הרוח בפינות ובמעברים שביניהם, ויוצרים מאחוריהם אזור רגוע.`,
        bars: { label: 'שיעור המדרכה באזור האצה, לפי רחוב', list: fast.streets, good: 'low' as const },
        tips: [
          { t: `לא למקם ישיבה ומשחק באזורים האדומים: ${names(fast.streets)}.`, d: 'שם הרוח במפלס הולך הרגל היא החזקה ביותר. ספסלים, מתקני משחק וכניסות לבניין צריכים לזוז לאזור הרגוע.', go: { topic: 'furniture' } },
          { t: 'לרכך את פינות המגדלים: מסד נמוך, חופה או עצים צפופים.', d: 'מסד של קומה או שתיים בולם את הרוח שיורדת לאורך חזית המגדל, לפני שהיא מגיעה למדרכה.', go: { topic: 'massing' } },
          { t: 'לנצל את צל הרוח לחורף, ולאוורר בקיץ.', d: 'האזורים הכחולים נעימים בחורף, אבל בקיץ חסרה בהם רוח. שם נדרש צל עמוק יותר.' },
          { t: 'להזמין ניתוח רוחות מקצועי.', d: 'זו המחשה מפושטת, ולא חישוב זרימה. מדד 31 בשכונה 360° דורש ניתוח של משטר הרוחות במפלס הולך הרגל.' },
        ] as Tip[],
      };
    }
    if (a === 'water') {
      setSurface(design);
      const by = new Map<string, { s: number; c: number }>();
      for (const w of WALK) {
        const e = by.get(w.n) ?? { s: 0, c: 0 };
        e.s += flowAt(w.p[0], w.p[1]);
        e.c++;
        by.set(w.n, e);
      }
      const streets = [...by].filter(([, e]) => e.c >= 12).map(([n, e]) => ({ n, v: e.s / e.c })).sort((x, y) => y.v - x.v);
      const sinks = sinksInPlan().length;
      return {
        title: design ? `לפי מפלסי התכנון, הנגר יורד בעיקר ל${mainSlope()} ומתרכז ב${streets[0]?.n ?? 'רחובות הראשיים'}` : `הנגר יורד בעיקר ל${mainSlope()}, ונעצר ב-${sinks} שקעים בתחום המגרשים`,
        lead: design
          ? `החישוב נעשה על מפלסי התכנון של הרחובות: 28 מפלסי שוחות מנספח הניקוז, שמשנים את הקרקע הקיימת ב-${designShift().toFixed(1)} מ' בממוצע. הקווים הכחולים מראים לאן המים זורמים, והצבע הכהה איפה הם מתרכזים. במצב המתוכנן אין שקעים: ההנחה היא שכל רחוב מתנקז במורד אל קולטן.`
          : 'החישוב נעשה על פני הקרקע הקיימים, לפני הפיתוח. הפרש הגובה בשטח הוא כ-34 מ\'. הקווים הכחולים מראים לאן המים זורמים, והצבע הכהה איפה הם מתרכזים. שקע: נקודה נמוכה שמנקזת אליה 6 דונם לפחות.',
        bars: { label: 'ריכוז הנגר, לפי רחוב', list: streets, good: 'low' as const },
        tips: [
          { t: `למקם את ערוגות הגשם ברחובות שמרכזים נגר: ${names(streets)}.`, d: 'שם רצועת הביוסוואל תקלוט הכי הרבה מים. ברחובות האחרים אפשר רצועה צרה יותר.', go: { topic: 'water' } },
          design
            ? { t: 'למקם השהיה בקצה התחתון של כל רחוב שמרכז נגר.', d: 'שם מצטברת הספיקה הגדולה ביותר לפני הכניסה לצנרת. גן גשם או רצועה מונמכת בנקודה הזו מקטינים את העומס על הקווים.', go: { topic: 'water' } }
            : { t: 'לתכנן השהיה בנקודות ההיקוות.', d: 'בנקודות הנמוכות המים נעצרים. שם מתאימים גן גשם, שטח ירוק מונמך או בור חלחול, ולא כניסה לחניון.', go: { topic: 'water' } },
          { t: 'לחבר את הרצועות לרשת רציפה, במורד השיפוע.', d: 'ביוסוואל מקוטע לא מוביל מים. נדרש רצף מהרחוב הגבוה אל השטח הפתוח הנמוך.' },
          design
            ? { t: 'להשוות בין שני המצבים: קרקע קיימת מול מפלסי תכנון.', d: 'רחוב שמרכז נגר רק במצב המתוכנן הוא תוצאה של עבודות העפר, ושם נדרש פתרון השהיה שלא היה נחוץ קודם.' }
            : { t: 'לעבור למפלסי התכנון.', d: 'הקרקע הקיימת מראה את הניקוז הטבעי. עבודות העפר ישנו את הזרימה, ולכן ההחלטות מתקבלות על המצב המתוכנן.' },
        ] as Tip[],
      };
    }
    const h = alongStreets(heatField(season));
    return {
      title: `מדד החום הממוצע במדרכות: ${Math.round(h.all * 100)} מתוך 100`,
      lead: `ב-${SEASON_NAME[season]}, בין 10:00 ל-16:00. המדד מכפיל את החשיפה לשמש בסוג המשטח: אספלט חם, ריצוף וחול בינוניים, שטח מגונן קריר.`,
      bars: { label: 'מדד החום, לפי רחוב', list: h.streets, good: 'low' as const },
      tips: [
        { t: `לטפל קודם ברחובות החמים: ${names(h.streets)}.`, d: 'שם השילוב של שמש ישירה ומשטח כהה הוא החזק ביותר. עץ נוסף או רצועת גינון מורידים את המדד.', go: { topic: 'planting' } },
        { t: 'לבחור ריצוף בהיר לרצועות ההליכה.', d: 'חלופה 3 כוללת רצועת שירות כהה (שחור בזלתי), שסופגת חום. מדד 28 בשכונה 360° דורש גוון מתון.', go: { topic: 'paving', item: 'paving-main', alt: 'street-3' } },
        { t: 'להרחיב את השטח המגונן על חשבון אספלט.', d: 'כל מטר של רצועת גינון במקום כביש מוריד את המדד, וגם קולט נגר.', go: { topic: 'water' } },
        { t: 'להצליל את מוקדי השהייה.', d: 'תחנות אוטובוס, ספסלים ומעברי חצייה באזורים האדומים צריכים צל משלהם.', go: { topic: 'furniture' } },
      ] as Tip[],
    };
  }, [a, season, windFrom, design]);
}

/** הצללת חצרות המגרשים, מול הדרישה שבהנחיות המרחביות: 20% מכלל שטח הפיתוח, בשלוש שעות ביוני */
function Yards() {
  const selectLot = usePlanStore((s) => s.selectLot);
  const rows = useMemo(() => [...yardShade()].sort((x, y) => x.min - y.min), []);
  const fail = rows.filter((r) => r.min < 0.2);
  return (
    <section className="mt-5 border-r-2 border-ink bg-white p-3">
      <h3 className="text-lg font-semibold">חצרות המגרשים: {fail.length} מתוך {rows.length} מתחת ל-20% צל</h3>
      <p className="mt-1 text-xs text-ink/55">מקור הדרישה: הנחיות מרחביות אשדוד, מהדורה 18, סעיף 2.2.2. נמדד ב-21 ביוני, בשעות 10:00, 12:00 ו-15:00.</p>
      <p className="mt-2 text-sm leading-relaxed">
        <span className="font-semibold">הנחיה לאדריכל: </span>
        <span className="bg-[#F4E9A8] px-1">במגרשים שברשימה נדרשים עצי צל או מצללות בתוך החצר, בעיקר לשעת הצהריים.</span>
      </p>
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="border-b border-ink/20 text-right text-ink/60">
            <th className="py-1 font-normal">מגרש</th>
            {YARD_HOURS.map((h) => (
              <th key={h} className="font-normal">
                {h}:00
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fail.map((r) => (
            <tr key={r.num} className="border-b border-ink/10">
              <td className="py-1">
                <button title="הצגת המגרש במודל" className="font-semibold underline decoration-ink/30 underline-offset-4" onClick={() => selectLot(r.num)}>
                  {r.num}
                </button>
              </td>
              {r.pct.map((v, i) => (
                <td key={i} className={v < 0.2 ? 'font-semibold text-wait' : ''}>
                  {Math.round(v * 100)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs leading-relaxed text-ink/50">
        החצר היא שטח המגרש בלי טביעת מעטפת הזכויות. הצל הוא של הבניינים ושל עצי הרחוב בלבד: עצים ומצללות בתוך המגרש עוד לא תוכננו, ולכן התוצאה היא נקודת המוצא ולא המצב הסופי. הדרישות ל-100% צל
        על ספסלים ול-40% בשטחי השהייה ייבדקו כשיהיה תכנון של החצר.
      </p>
    </section>
  );
}

export default function AnalysisPanel({ a }: { a: Analysis }) {
  const p = usePlanStore((s) => s.analysisParams);
  const set = usePlanStore((s) => s.setAnalysisParams);
  const setAnalysis = usePlanStore((s) => s.setAnalysis);
  const setView = usePlanStore((s) => s.setView);
  const playing = usePlanStore((s) => s.sunPlaying);
  const setPlaying = usePlanStore((s) => s.setSunPlaying);
  const wind = effWind(p);
  const f = useFindings(a, p.season, a === 'wind' ? wind.from : p.windFrom, p.design);

  // תנועת השמש: שעה אחרי שעה
  useEffect(() => {
    const sun = a === 'shade' && !p.day;
    const breeze = a === 'wind' && p.windDay;
    if ((!sun && !breeze) || !playing) return;
    const t = window.setInterval(() => {
      const h = usePlanStore.getState().analysisParams.hour;
      usePlanStore.getState().setAnalysisParams({ hour: breeze ? (h >= 23.75 ? 0 : h + 0.25) : h >= 17 ? 7 : h + 0.25 });
    }, 220);
    return () => window.clearInterval(t);
  }, [a, playing, p.day, p.windDay]);

  const max = Math.max(0.01, ...f.bars.list.map((s) => s.v));
  const seasonBtns = (
    <div className="grid grid-cols-3 gap-1">
      {(Object.keys(SEASON_NAME) as Season[]).map((s) => (
        <button key={s} title="תאריך החישוב" aria-pressed={p.season === s} onClick={() => set({ season: s })} className={`btn px-1 py-1.5 text-xs ${p.season === s ? 'btn-on' : ''}`}>
          {SEASON_NAME[s]}
        </button>
      ))}
    </div>
  );

  return (
    <PanelShell name={`ניתוח: ${NAME[a]}`} title={f.title} lead={f.lead} onClose={() => setAnalysis(null)}>
      <div className="no-print mt-4 space-y-2 bg-ink/[0.04] p-2">
        {(a === 'shade' || a === 'heat') && seasonBtns}
        {a === 'shade' && (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button title="הצל בשעה שנבחרה" aria-pressed={!p.day} onClick={() => set({ day: false })} className={`btn py-1.5 text-xs ${!p.day ? 'btn-on' : ''}`}>
                צל לפי שעה
              </button>
              <button title="כמה שעות צל בכל נקודה" aria-pressed={p.day} onClick={() => set({ day: true })} className={`btn py-1.5 text-xs ${p.day ? 'btn-on' : ''}`}>
                מפת צל יומית
              </button>
            </div>
            {!p.day && (
              <div className="flex items-center gap-2">
                <button title={playing ? 'עצירת תנועת השמש' : 'הפעלת תנועת השמש'} className="btn w-16 py-1 text-xs" onClick={() => setPlaying(!playing)}>
                  {playing ? 'עצירה' : 'הפעלה'}
                </button>
                <input
                  type="range"
                  min={7}
                  max={17}
                  step={0.25}
                  value={p.hour}
                  aria-label="שעה"
                  title="שעת היום"
                  className="flex-1 accent-[#2E2E2B]"
                  onChange={(e) => {
                    setPlaying(false);
                    set({ hour: Number(e.target.value) });
                  }}
                />
                <span className="w-12 text-left text-sm font-semibold" dir="ltr">
                  {Math.floor(p.hour)}:{String(Math.round((p.hour % 1) * 60)).padStart(2, '0')}
                </span>
              </div>
            )}
          </>
        )}
        {a === 'water' && (
          <div className="grid grid-cols-2 gap-1">
            <button title="ניקוז לפי מפלסי הרחובות המתוכננים" aria-pressed={p.design} onClick={() => set({ design: true })} className={`btn py-1.5 text-xs ${p.design ? 'btn-on' : ''}`}>
              מפלסי התכנון
            </button>
            <button title="ניקוז טבעי, לפני הפיתוח" aria-pressed={!p.design} onClick={() => set({ design: false })} className={`btn py-1.5 text-xs ${!p.design ? 'btn-on' : ''}`}>
              קרקע קיימת
            </button>
          </div>
        )}
        {a === 'wind' && (
          <>
            {seasonBtns}
            <div className="grid grid-cols-2 gap-1">
              <button title="הרוח משתנה לאורך היום" aria-pressed={p.windDay} onClick={() => set({ windDay: true })} className={`btn py-1.5 text-xs ${p.windDay ? 'btn-on' : ''}`}>
                מחזור יומי
              </button>
              <button title="בוחרים כיוון אחד" aria-pressed={!p.windDay} onClick={() => set({ windDay: false })} className={`btn py-1.5 text-xs ${!p.windDay ? 'btn-on' : ''}`}>
                כיוון קבוע
              </button>
            </div>
            {p.windDay && (
              <>
                <div className="flex items-center gap-2">
                  <button title={playing ? 'עצירת השעון' : 'הפעלת השעון'} className="btn w-16 py-1 text-xs" onClick={() => setPlaying(!playing)}>
                    {playing ? 'עצירה' : 'הפעלה'}
                  </button>
                  <input type="range" min={0} max={23.75} step={0.25} value={p.hour} aria-label="שעה" title="שעת היום" className="flex-1 accent-[#2E2E2B]" onChange={(e) => (setPlaying(false), set({ hour: Number(e.target.value) }))} />
                  <span className="w-12 text-left text-sm font-semibold" dir="ltr">
                    {Math.floor(p.hour)}:{String(Math.round((p.hour % 1) * 60)).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-sm">
                  עכשיו: רוח <span className="font-semibold">מ{windName(wind.from)}</span>, בעוצמה של <span className="font-semibold">{Math.round(wind.strength * 100)}%</span> מהשיא.
                </p>
              </>
            )}
          </>
        )}
        {a === 'wind' && !p.windDay && (
          <div className="grid grid-cols-4 gap-1">
            {WIND_DIRS.map((w) => (
              <button key={w.deg} title="הכיוון שממנו הרוח נושבת" aria-pressed={p.windFrom === w.deg} onClick={() => set({ windFrom: w.deg })} className={`btn px-1 py-1.5 text-xs ${p.windFrom === w.deg ? 'btn-on' : ''}`}>
                {w.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <IconBtn icon="top" label="מבט על" onClick={() => setView('top')} />
          <div className="flex-1">
            <div className="h-3" style={{ background: a === 'shade' && !p.day ? 'linear-gradient(to left, #1E223C99, #1E223C99)' : rampCss(a) }} />
            <div className="mt-0.5 flex justify-between text-xs text-ink/60">
              <span>{a === 'shade' && !p.day ? 'כהה: צל בשעה הזו' : RAMPS[a].low}</span>
              <span>{a === 'shade' && !p.day ? '' : RAMPS[a].high}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-5">
        <h3 className="text-lg font-semibold">המלצות לתכנון</h3>
        <ol className="mt-2 space-y-2">
          {f.tips.map((t, i) => (
            <li key={i} className="grid grid-cols-[2.2rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
              <span className="text-3xl font-light leading-none text-ink/35">{i + 1}</span>
              <div>
                <p className="text-base leading-snug">
                  <span className="font-semibold">הנחיה לאדריכל: </span>
              <span className="bg-[#F4E9A8] px-1">{t.t}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/75">{t.d}</p>
                {t.go && <ShowBtn go={t.go!} />}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {a === 'shade' && <Yards />}

      <section className="mt-5">
        <h3 className="text-sm font-semibold">{f.bars.label}</h3>
        <p className="mb-1 text-xs text-ink/50">{f.bars.good === 'high' ? 'גבוה עדיף. הרחובות החלשים בתחתית.' : 'נמוך עדיף. הרחובות הבעייתיים בראש.'}</p>
        <ul>
          {f.bars.list.map((s) => (
            <li key={s.n} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 py-[0.15rem] text-xs">
              <span className="truncate">{s.n}</span>
              <span className="block h-2 bg-ink/[0.06]">
                <span className="block h-full bg-ink/60" style={{ width: `${(s.v / max) * 100}%` }} />
              </span>
              <span className="text-left text-ink/60">{pct(s.v)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-5 text-xs leading-relaxed text-ink/50">
        זהו מודל מפושט להמחשה ולכיוון תכנוני, ולא סימולציה הנדסית. הבניינים הם מעטפות הזכויות, ולא התכנון הסופי. העצים ממוקמים לפי כללי האוגדן, ולא לפי תוכנית נטיעות.
        {a === 'wind' && ' המחזור היומי הוא דפוס אופייני למישור החוף (בריזת ים ובריזת יבשה), ולא מדידה של תחנה. צבע הקווים ואורכם מראים את המהירות: כחול לחלשה, אדום לחזקה. הרוח אינה חישוב זרימה: היא מסמנת אזור מוגן מאחורי כל בניין, ואזור האצה סביב מגדלים.'}
        {a === 'water' && ' הקרקע הקיימת: SRTM, רזולוציה של כ-30 מ\'. מפלסי התכנון: 28 נקודות לאורך הרחובות בלבד, שנקראו בעין מנספח הניקוז. בין הרחובות ובתוך המגרשים המשטח הוא אינטרפולציה.'}
        {a === 'heat' && ' המדד אינו טמפרטורה.'}
      </p>
    </PanelShell>
  );
}
