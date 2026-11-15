import type { ItemStatus } from '../../types/plan';

export const STATUS_LABEL: Record<ItemStatus, string> = {
  complete: 'הושלם',
  pending: 'להשלמה',
  partial: 'חלקי',
};

const variants: Record<ItemStatus, string> = {
  complete: 'bg-done/10 text-done',
  pending: 'bg-wait/10 text-wait',
  partial: 'bg-part/10 text-part',
};

export default function Badge({ status, label }: { status: ItemStatus; label?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 text-xs ${variants[status]}`}>
      <span className="h-1.5 w-1.5 bg-current" />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
