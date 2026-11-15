import { usePlanStore } from '../../store/planStore';
import type { CameraView } from '../../types/plan';

const VIEWS: { id: CameraView; label: string }[] = [
  { id: 'top', label: 'תצוגה עילית' },
  { id: 'perspective', label: 'פרספקטיבה' },
  { id: 'street', label: 'תצוגת רחוב' },
];

export default function ViewControls() {
  const view = usePlanStore((s) => s.view);
  const setView = usePlanStore((s) => s.setView);
  return (
    <div className="flex gap-1" role="group" aria-label="מבט על המודל">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          aria-pressed={view.name === v.id}
          className={`btn w-24 px-2 py-1 text-xs ${view.name === v.id ? 'btn-on' : ''}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
