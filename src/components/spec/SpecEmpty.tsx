import { completionStats, sortedTopics, usePlanStore } from '../../store/planStore';
import Badge from '../ui/Badge';

export default function SpecEmpty() {
  const topics = usePlanStore((s) => s.topics);
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const { total, complete } = completionStats(topics);
  const open = sortedTopics(topics).filter((t) => t.status !== 'complete');

  return (
    <div className="fade-in">
      <p className="text-xs text-ink/50">תוכנית בינוי, הרובע המיוחד</p>
      <h2 className="mt-1 text-2xl font-light leading-snug">
        התוכנית <span className="font-semibold">אינה סופית</span>: {total - complete} נושאים עוד פתוחים
      </h2>

      {/* מד השלמה: משבצת לכל נושא */}
      <div className="mt-5 flex gap-1" aria-label={`${complete} מתוך ${total} נושאים הושלמו`}>
        {sortedTopics(topics).map((t) => (
          <button
            key={t.id}
            title={t.nameHe}
            onClick={() => selectTopic(t.id)}
            className={`h-3 flex-1 hover:shadow-md ${
              t.status === 'complete' ? 'bg-done' : t.status === 'partial' ? 'bg-part/50' : 'bg-wait/30'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/70">
        <span className="font-semibold">{complete}</span> מתוך <span className="font-semibold">{total}</span> נושאים
        הושלמו.
      </p>

      {open.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-semibold text-ink/60">פרקים למעקב מול המתכננים</h3>
          <ul className="space-y-1">
            {open.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => selectTopic(t.id)}
                  className="flex w-full items-start gap-3 bg-ink/[0.04] px-3 py-2 text-right hover:bg-ink/[0.07] hover:shadow-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t.nameHe}</span>
                    <span className="block text-xs leading-relaxed text-ink/60">
                      {t.items.find((i) => i.status === 'pending')?.note ?? 'הפרק הוגש בחלקו'}
                    </span>
                  </span>
                  <Badge status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-sm text-ink/60">בחרי נושא מהסרגל, או לחצי על חלק במודל, להצגת המפרט.</p>
    </div>
  );
}
