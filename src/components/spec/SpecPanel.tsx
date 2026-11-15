import { usePlanStore, useSelection } from '../../store/planStore';
import type { SpecItem } from '../../types/plan';
import SpecEmpty from './SpecEmpty';
import SpecHeader from './SpecHeader';
import SpecLegend from './SpecLegend';
import SpecPending from './SpecPending';
import SpecEditForm from './SpecEditForm';
import SpecStatutory from './SpecStatutory';
import QuarterPanel from './QuarterPanel';
import PublicPanel from './PublicPanel';
import { IconBtn } from '../ui/Icon';
import SpecAlternatives from './SpecAlternatives';
import InsightPanelView from '../insight/InsightPanelView';
import StatusPanel from '../insight/StatusPanel';
import WorkPlan from '../insight/WorkPlan';
import MetricsPanel from '../insight/MetricsPanel';

export default function SpecPanel() {
  const { topic, item } = useSelection();
  const isEditMode = usePlanStore((s) => s.isEditMode);
  const selectItem = usePlanStore((s) => s.selectItem);
  const selectTopic = usePlanStore((s) => s.selectTopic);
  const addItem = usePlanStore((s) => s.addItem);
  const panel = usePlanStore((s) => s.panel);

  const newItem = () => {
    if (!topic) return;
    const fresh: SpecItem = {
      id: `${topic.id}-${Date.now()}`,
      nameHe: 'פריט חדש',
      description: '',
      legend: [],
      status: 'pending',
      note: 'פריט חדש. ממתין למפרט',
    };
    addItem(topic.id, fresh);
  };

  return (
    <aside
      aria-label="מפרט"
      className="print-root min-h-0 flex-1 overflow-y-auto bg-white p-4 shadow-[-1px_0_0_#E7E2DA_inset] md:h-full md:flex-1 md:p-6"
    >
      {panel === 'status' ? (
        <StatusPanel />
      ) : panel === 'work' ? (
        <WorkPlan />
      ) : panel === 'metrics' ? (
        <MetricsPanel />
      ) : panel ? (
        <InsightPanelView key={panel} id={panel} />
      ) : !topic || !item ? (
        <SpecEmpty />
      ) : (
        <div key={topic.id} className="fade-in">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3 w-3" style={{ background: topic.layerColor }} />
            <span className="flex-1 text-sm font-semibold">{topic.nameHe}</span>
            <IconBtn icon="home" label="חזרה למבט הכולל" onClick={() => selectTopic(null)} />
          </div>

          {topic.id !== 'massing' && topic.id !== 'public' && (topic.items.length > 1 || isEditMode) && (
            <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="פריטים בנושא">
              {topic.items.map((i) => (
                <button
                  key={i.id}
                  role="tab"
                  aria-selected={i.id === item.id}
                  onClick={() => selectItem(i.id)}
                  className={`btn px-3 py-1.5 text-xs ${i.id === item.id ? 'btn-on' : ''}`}
                >
                  {i.nameHe}
                </button>
              ))}
              {isEditMode && (
                <button className="btn px-3 py-1.5 text-xs" onClick={newItem}>
                  הוספת פריט
                </button>
              )}
            </div>
          )}

          <div
            key={item.id}
            className="flash-once"
            style={{ ['--flash' as string]: `${topic.layerColor ?? '#F4E9A8'}55` }}
          >
            {topic.id === 'massing' ? (
              <QuarterPanel topic={topic} item={item} />
            ) : topic.id === 'public' ? (
              <PublicPanel topic={topic} item={item} />
            ) : item.alternatives?.length ? (
              <>
                <SpecAlternatives item={item} topic={topic} />
                <SpecLegend item={item} />
                {item.note && <p className="mt-4 bg-ink/[0.04] p-3 text-xs text-ink/70">{item.note}</p>}
                <SpecStatutory topic={topic} />
              </>
            ) : isEditMode ? (
              <SpecEditForm key={item.id} topic={topic} item={item} />
            ) : item.status === 'pending' ? (
              <>
                <SpecPending item={item} topic={topic} />
                <SpecStatutory topic={topic} />
              </>
            ) : (
              <>
                <SpecHeader item={item} topic={topic} />
                <SpecLegend item={item} />
                {item.note && <p className="mt-4 bg-ink/[0.04] p-3 text-xs text-ink/70">{item.note}</p>}
                <SpecStatutory topic={topic} />
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
