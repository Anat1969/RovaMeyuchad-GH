import { sortedTopics, usePlanStore } from '../../store/planStore';
import type { InsightItem } from '../../data/insights';
import type { ItemStatus } from '../../types/plan';
import PanelShell from './PanelShell';
import { ItemRow } from './InsightPanelView';

const GROUPS: { status: ItemStatus; h: string; tone: InsightItem['tone'] }[] = [
  { status: 'complete', h: 'בוצע: פרקים שהוגשו', tone: 'ok' },
  { status: 'partial', h: 'בוצע בחלקו', tone: 'part' },
  { status: 'pending', h: 'לא בוצע: פרקים שממתינים להשלמה', tone: 'miss' },
];

/** מה בוצע ומה לא: נגזר ישירות מסטטוס הנושאים, ולכן מתעדכן כשמשלימים פרק */
export default function StatusPanel() {
  const topics = usePlanStore((s) => s.topics);
  const list = sortedTopics(topics);
  const n = (s: ItemStatus) => list.filter((t) => t.status === s).length;

  return (
    <PanelShell
      name="מה בוצע"
      title={`${n('complete')} פרקים הוגשו, ${n('pending') + n('partial')} עוד פתוחים`}
      lead="הסטטוס נגזר מהמצגת ומהוראות התכנית. גם בפרק שלא הוגש, מוצג מה שהתכנית המאושרת כבר מחייבת."
    >
      <div className="mt-3 flex h-3 gap-0.5" aria-hidden>
        {list.map((t) => (
          <span key={t.id} className={`flex-1 ${t.status === 'complete' ? 'bg-done' : t.status === 'partial' ? 'bg-part/50' : 'bg-wait/60'}`} />
        ))}
      </div>
      {GROUPS.map((g) => {
        const group = list.filter((t) => t.status === g.status);
        if (!group.length) return null;
        return (
          <section key={g.status} className="mt-5">
            <h3 className="text-sm font-semibold">{g.h}</h3>
            <ul className="mt-2 space-y-1">
              {group.map((t) => {
                const notes = t.items.map((i) => i.note).filter(Boolean);
                const alt = t.items.find((i) => i.alternatives?.length);
                const chosen = alt?.alternatives?.find((a) => a.id === alt.selectedAlternativeId);
                const d = [
                  `${t.items.length === 1 ? 'פריט אחד' : `${t.items.length} פריטים`}: ${t.items.map((i) => i.nameHe).join(', ')}.`,
                  chosen ? `חלופה נבחרת: ${chosen.label}, ${chosen.title}.` : '',
                  notes[0] ?? '',
                  g.status !== 'complete' && t.statutory?.length ? `התכנית המאושרת כבר מחייבת: ${t.statutory[0].text}` : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <ItemRow
                    key={t.id}
                    it={{
                      t: t.nameHe,
                      d,
                      tone: g.tone,
                      ref: t.items[0]?.specRef,
                      go: { topic: t.id, view: t.id === 'massing' ? 'perspective' : 'detail' },
                    }}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="mt-5 text-xs leading-relaxed text-ink/50">
        הערה: על פרקי הצמחייה במצגת יש חותמת "יעודכן בתכנון מפורט". הם מסומנים כאן "בוצע" כי התוכן הוגש, אבל אינם סופיים.
      </p>
    </PanelShell>
  );
}
