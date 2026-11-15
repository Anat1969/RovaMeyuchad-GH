import { useEffect, useRef, useState } from 'react';
import type { ItemStatus, LegendEntry, PlanTopic, SpecItem } from '../../types/plan';
import { usePlanStore } from '../../store/planStore';
import { SpecImage } from './SpecHeader';
import { STATUS_LABEL } from '../ui/Badge';

/** מקטין תמונה לפני שמירה בדפדפן */
function shrinkImage(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('bad image'));
    img.src = url;
  });
}

const STATUSES: ItemStatus[] = ['complete', 'partial', 'pending'];

export default function SpecEditForm({ topic, item }: { topic: PlanTopic; item: SpecItem }) {
  const updateItem = usePlanStore((s) => s.updateItem);
  const toggleEditMode = usePlanStore((s) => s.toggleEditMode);
  const savedAt = usePlanStore((s) => s.savedAt);
  const [snapshot] = useState<SpecItem>(() => JSON.parse(JSON.stringify(item)));
  const [openedAt] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);

  // כל שינוי נשמר מיד, והמודל מתעדכן מול העיניים
  const patch = (p: Partial<SpecItem>) => updateItem(topic.id, item.id, p);
  const setLegend = (legend: LegendEntry[]) => patch({ legend });
  const setEntry = (idx: number, p: Partial<LegendEntry>) =>
    setLegend(item.legend.map((e, i) => (i === idx ? { ...e, ...p } : e)));

  const takeImage = async (file?: Blob | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('הקובץ אינו תמונה. אפשר להעלות JPG, PNG או WebP.');
      return;
    }
    try {
      patch({ image: await shrinkImage(file), imageCredit: undefined });
      setError('');
    } catch {
      setError('לא הצלחתי לקרוא את התמונה. נסי קובץ אחר.');
    }
  };

  // הדבקה: תמונה או קישור לתמונה
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void takeImage(file);
        return;
      }
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      const text = e.clipboardData?.getData('text').trim() ?? '';
      if (!typing && /^https?:\/\/\S+$/.test(text)) patch({ image: text, imageCredit: undefined });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...item.legend];
    const [e] = next.splice(from, 1);
    next.splice(to, 0, e);
    setLegend(next);
  };

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void takeImage(e.dataTransfer.files[0]);
        }}
        className={over ? 'outline outline-2 outline-ink' : ''}
      >
        <SpecImage item={item} topic={topic} />
        <div className="mt-1 flex items-center gap-1">
          <button type="button" className="btn flex-1 text-xs" onClick={() => fileInput.current?.click()}>
            {item.image ? 'החלפת תמונה' : 'העלאת תמונה'}
          </button>
          {item.image && (
            <button type="button" className="btn text-xs" onClick={() => patch({ image: undefined, imageCredit: undefined })}>
              הסרה
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-ink/45">אפשר גם לגרור לכאן קובץ, או להדביק תמונה או קישור.</p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void takeImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>

      <div>
        <label className="label" htmlFor="f-name">
          שם הפריט
        </label>
        <input id="f-name" className="field" value={item.nameHe} onChange={(e) => patch({ nameHe: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="f-desc">
          תיאור ופרמטרים
        </label>
        <textarea
          id="f-desc"
          rows={3}
          className="field resize-none"
          value={item.description ?? ''}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      <fieldset>
        <legend className="label">מקרא. גרירה של שורה משנה את הסדר</legend>
        <ul className="space-y-1">
          {item.legend.map((entry, idx) => (
            <li
              key={idx}
              draggable
              onDragStart={() => (dragFrom.current = idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragFrom.current !== null) move(dragFrom.current, idx);
                dragFrom.current = null;
              }}
              className="flex items-start gap-1 bg-ink/[0.03] p-1"
            >
              <span className="cursor-grab select-none px-1 pt-2 text-xs text-ink/40" title="גרירה לשינוי הסדר">
                גררי
              </span>
              <input
                type="color"
                aria-label="צבע"
                className="h-9 w-9 shrink-0 cursor-pointer bg-transparent"
                value={entry.color}
                onChange={(e) => setEntry(idx, { color: e.target.value })}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  className="field"
                  placeholder="שם החומר או המין"
                  aria-label="שם בעברית"
                  value={entry.label}
                  onChange={(e) => setEntry(idx, { label: e.target.value })}
                />
                <div className="flex gap-1">
                  <input
                    className="field"
                    dir="ltr"
                    placeholder="Latin name"
                    aria-label="שם לטיני"
                    value={entry.latinName ?? ''}
                    onChange={(e) => setEntry(idx, { latinName: e.target.value || undefined })}
                  />
                  <input
                    className="field w-24 shrink-0"
                    placeholder='מק"ט'
                    aria-label='מק"ט'
                    value={entry.code ?? ''}
                    onChange={(e) => setEntry(idx, { code: e.target.value || undefined })}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn px-2 text-xs"
                onClick={() => setLegend(item.legend.filter((_, i) => i !== idx))}
              >
                מחיקה
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn mt-1 w-full text-xs"
          onClick={() => setLegend([...item.legend, { color: topic.layerColor ?? '#77736C', label: '' }])}
        >
          הוספת שורה למקרא
        </button>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="f-ref">
            מקור או עמוד
          </label>
          <input id="f-ref" className="field" value={item.specRef ?? ''} onChange={(e) => patch({ specRef: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="f-note">
            הערה
          </label>
          <input id="f-note" className="field" value={item.note ?? ''} onChange={(e) => patch({ note: e.target.value })} />
        </div>
      </div>

      <fieldset>
        <legend className="label">סטטוס. קובע אם החלק במודל מלא או בקווי מתאר</legend>
        <div className="grid grid-cols-3 gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={item.status === s}
              className={`btn text-xs ${item.status === s ? 'btn-on' : ''}`}
              onClick={() => patch({ status: s })}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-1 bg-white px-1 py-2">
        <button type="button" className="btn btn-on flex-1" onClick={() => toggleEditMode(false)}>
          שמירה וסיום
        </button>
        <button
          type="button"
          className="btn flex-1"
          onClick={() => {
            patch({
              ...snapshot,
              image: snapshot.image,
              imageCredit: snapshot.imageCredit,
              note: snapshot.note,
              specRef: snapshot.specRef,
            });
            toggleEditMode(false);
          }}
        >
          ביטול השינויים
        </button>
        <span className="w-14 text-center text-xs text-done" aria-live="polite">
          {savedAt > openedAt ? 'נשמר' : ''}
        </span>
      </div>
    </form>
  );
}
