import { useEffect, useState } from 'react';
import { APPENDICES } from '../../data/appendices';
import { DECK_URL } from '../../data/insights';
import { SOURCES } from '../../data/sources';
import { usePlanStore } from '../../store/planStore';
import { IconBtn } from '../ui/Icon';
import PanelShell from './PanelShell';

interface Saved {
  id: number;
  name: string;
  type: string;
  blob: Blob;
}
/** קבצים שהועלו נשמרים בדפדפן הזה בלבד (IndexedDB) */
const db = () =>
  new Promise<IDBDatabase>((ok, no) => {
    const r = indexedDB.open('rova3d-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const d = await db();
  return new Promise<T>((ok, no) => {
    const r = f(d.transaction('files', mode).objectStore('files'));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
};

/** ספרייה ועריכה: מסמכי התכנית, קבצים שהועלו, מקורות המידע, ומצב העריכה */
export default function LibraryPanel() {
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const toggleEditMode = usePlanStore((s) => s.toggleEditMode);
  const resetData = usePlanStore((s) => s.resetData);
  const custom = usePlanStore((s) => s.customSheet);
  const setCustom = usePlanStore((s) => s.setCustomSheet);
  const [files, setFiles] = useState<Saved[]>([]);
  const [err, setErr] = useState('');
  const load = () => tx<Saved[]>('readonly', (s) => s.getAll()).then(setFiles, () => setErr('הדפדפן חוסם שמירת קבצים.'));
  useEffect(() => void load(), []);

  const add = async (list: FileList | null) => {
    for (const f of Array.from(list ?? [])) await tx('readwrite', (s) => s.add({ name: f.name, type: f.type, blob: f }));
    load();
  };
  const place = (f: Saved) => {
    const url = URL.createObjectURL(f.blob);
    const img = new Image();
    img.onload = () => setCustom({ img: url, name: f.name, cx: 0, cy: 0, w: 900, h: (900 * img.height) / img.width, angle: 0 });
    img.src = url;
  };
  const docs = [{ name: 'מצגת שפת רחוב ושצ"פ, צוות התכנון', url: DECK_URL }, ...APPENDICES.flatMap((a) => a.docs.map((d) => ({ name: `${a.name}: ${d.name}`, url: d.url })))];
  const slider = (label: string, key: 'cx' | 'cy' | 'w' | 'angle', min: number, max: number, step: number) => (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-14">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={custom![key]}
        className="flex-1 accent-[#2E2E2B]"
        onChange={(e) => {
          const v = Number(e.target.value);
          setCustom({ ...custom!, [key]: v, ...(key === 'w' && { h: (custom!.h / custom!.w) * v }) });
        }}
      />
    </label>
  );

  return (
    <PanelShell name="ספרייה ועריכה" title={`${docs.length} מסמכי תכנית, ${files.length} קבצים שהעלית`} lead="כל המסמכים במקום אחד. קובץ שמעלים נשמר בדפדפן הזה, ותמונה אפשר להניח על המודל ולמקם אותה.">
      <section className="no-print mt-4">
        <h3 className="text-sm font-semibold">העלאת קבצים</h3>
        <input type="file" multiple accept="image/*,.pdf" title="בחירת קבצים מהמחשב" className="mt-2 block w-full text-sm file:ml-3 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-white" onChange={(e) => add(e.target.files)} />
        {err && <p className="mt-1 text-xs text-wait">{err}</p>}
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1 text-sm">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              {f.type.startsWith('image/') && (
                <button className="btn px-2 py-1 text-xs" title="הנחת התמונה על המודל" onClick={() => place(f)}>
                  על המודל
                </button>
              )}
              <IconBtn icon="external" label="פתיחת הקובץ" onClick={() => window.open(URL.createObjectURL(f.blob), '_blank')} />
              <IconBtn icon="trash" label="מחיקת הקובץ" onClick={() => tx('readwrite', (s) => s.delete(f.id)).then(load)} />
            </li>
          ))}
        </ul>
        {custom && (
          <div className="mt-2 space-y-1 bg-ink/[0.04] p-3">
            <p className="text-xs font-semibold">מיקום "{custom.name}" על המודל</p>
            {slider('מזרח', 'cx', -900, 900, 5)}
            {slider('צפון', 'cy', -900, 900, 5)}
            {slider('רוחב', 'w', 100, 2500, 10)}
            {slider('סיבוב', 'angle', -3.14, 3.14, 0.01)}
            <button className="btn px-2 py-1 text-xs" title="הסרת התמונה מהמודל" onClick={() => setCustom(null)}>
              הסרה מהמודל
            </button>
          </div>
        )}
        <p className="mt-2 text-xs leading-relaxed text-ink/50">תמונה מונחת על הקרקע ומכוונת ידנית. קובץ PDF נשמר ונפתח, אבל אינו מונח על המודל. קובצי DWG ו-SHP דורשים המרה: שלחי אותם אליי.</p>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">מסמכי התכנית</h3>
        <ol className="mt-2 list-decimal space-y-1 pr-5 text-sm">
          {docs.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer" title="פתיחת המסמך" className="underline decoration-ink/30 underline-offset-4">
                {d.name}
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">מקורות המידע</h3>
        <ol className="mt-2 space-y-2">
          {SOURCES.map((s, i) => (
            <li key={s.name} className="grid grid-cols-[2.2rem_1fr] gap-x-2 bg-ink/[0.03] p-3">
              <span className="text-3xl font-light leading-none text-ink/35">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold leading-snug">
                  {s.name} <span className="text-xs font-normal text-ink/50">{s.kind}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/75">{s.gives}</p>
                {s.app && (
                  <a href={s.app} target="_blank" rel="noreferrer" className="no-print text-xs underline underline-offset-4">
                    פתיחה
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="no-print mt-6">
        <h3 className="text-sm font-semibold">עריכה</h3>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <button className={`btn py-2 text-sm ${isEditMode ? 'btn-on' : ''}`} title="השלמת פרקים ועדכון מפרטים" aria-pressed={isEditMode} onClick={() => toggleEditMode()}>
            {isEditMode ? 'סיום עריכה' : 'מצב עריכה'}
          </button>
          <button className="btn py-2 text-sm" title="מוחק את מה שנשמר בדפדפן" onClick={() => window.confirm('להחזיר את כל הנתונים לנוסח המקורי? העריכות והמשימות שהוספת יימחקו.') && resetData()}>
            איפוס לנתוני המקור
          </button>
        </div>
      </section>
    </PanelShell>
  );
}
