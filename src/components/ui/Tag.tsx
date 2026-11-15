import { stage, type StageId } from '../../data/stages';

/** תווית המקור של מידע: סטטוטורי, צרכים, תכנון או הערות. הצבע הוא צבע השלב */
export default function Tag({ s, text }: { s: StageId; text?: string }) {
  const st = stage(s);
  return (
    <span className="inline-block whitespace-nowrap px-1.5 py-0.5 align-middle text-[11px] font-semibold text-white" style={{ background: st.color }}>
      {text ?? st.tag}
    </span>
  );
}
