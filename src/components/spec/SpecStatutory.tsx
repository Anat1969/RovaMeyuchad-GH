import type { PlanTopic } from '../../types/plan';

/** מה שהוראות התכנית המאושרת כבר קובעות לנושא, גם כשהפרק בתוכנית הבינוי חסר */
export default function SpecStatutory({ topic }: { topic: PlanTopic }) {
  if (!topic.statutory?.length) return null;
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-semibold">
        <span className="bg-[#F4E9A8] px-1">התכנית המאושרת כבר מחייבת</span>
      </h3>
      <ul className="space-y-2">
        {topic.statutory.map((r, i) => (
          <li key={i} className="flex items-baseline gap-3 text-sm leading-snug">
            <span className="flex-1">{r.text}</span>
            <span className="shrink-0 text-xs text-ink/45">{r.ref}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink/45">מקור: הוראות תכנית 603-0811588.</p>
    </section>
  );
}
