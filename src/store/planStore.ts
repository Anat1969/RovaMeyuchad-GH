import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CameraView, ItemStatus, PlanTopic, SpecItem } from '../types/plan';
import { PLAN_TOPICS } from '../data/planData';

export interface LegendFocus {
  itemId: string;
  idx: number;
}

interface PlanState {
  topics: PlanTopic[];
  selectedTopicId: string | null;
  selectedItemId: string | null;
  isEditMode: boolean;
  legendFocus: LegendFocus | null;
  view: { name: CameraView; tick: number };
  savedAt: number;

  selectTopic: (id: string | null, itemId?: string) => void;
  selectItem: (id: string) => void;
  toggleEditMode: (on?: boolean) => void;
  updateItem: (topicId: string, itemId: string, patch: Partial<SpecItem>) => void;
  addItem: (topicId: string, item: SpecItem) => void;
  addTopic: (nameHe: string) => void;
  resetData: () => void;
  setLegendFocus: (f: LegendFocus | null) => void;
  setView: (name: CameraView) => void;
}

const clone = (t: PlanTopic[]): PlanTopic[] => JSON.parse(JSON.stringify(t));

/** סטטוס נושא נגזר מהפריטים שלו */
function topicStatus(items: SpecItem[]): ItemStatus {
  if (items.every((i) => i.status === 'complete')) return 'complete';
  if (items.every((i) => i.status === 'pending')) return 'pending';
  return 'partial';
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      topics: clone(PLAN_TOPICS),
      selectedTopicId: null,
      selectedItemId: null,
      isEditMode: false,
      legendFocus: null,
      view: { name: 'perspective', tick: 0 },
      savedAt: 0,

      selectTopic: (id, itemId) =>
        set((s) => {
          const topic = s.topics.find((t) => t.id === id) ?? null;
          return {
            selectedTopicId: topic?.id ?? null,
            selectedItemId: topic ? (itemId ?? topic.items[0]?.id ?? null) : null,
            legendFocus: null,
          };
        }),
      selectItem: (id) => set({ selectedItemId: id, legendFocus: null }),
      toggleEditMode: (on) => set((s) => ({ isEditMode: on ?? !s.isEditMode })),

      updateItem: (topicId, itemId, patch) =>
        set((s) => ({
          savedAt: Date.now(),
          topics: s.topics.map((t) => {
            if (t.id !== topicId) return t;
            const before = t.items.find((i) => i.id === itemId)?.status;
            const items = t.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
            // הסטטוס של הנושא מתעדכן רק כשסטטוס של פריט באמת השתנה
            const status = patch.status && patch.status !== before ? topicStatus(items) : t.status;
            return { ...t, items, status };
          }),
        })),

      addItem: (topicId, item) =>
        set((s) => ({
          savedAt: Date.now(),
          selectedItemId: item.id,
          topics: s.topics.map((t) => {
            if (t.id !== topicId) return t;
            const items = [...t.items, item];
            return { ...t, items, status: topicStatus(items) };
          }),
        })),

      addTopic: (nameHe) =>
        set((s) => {
          const id = `topic-${Date.now()}`;
          const item: SpecItem = {
            id: `${id}-item`,
            nameHe,
            description: '',
            legend: [],
            status: 'pending',
            note: 'נושא חדש. ממתין למפרט',
          };
          const topic: PlanTopic = {
            id,
            nameHe,
            status: 'pending',
            layerColor: '#77736C',
            sortOrder: Math.max(0, ...s.topics.map((t) => t.sortOrder)) + 1,
            items: [item],
          };
          return {
            savedAt: Date.now(),
            topics: [...s.topics, topic],
            selectedTopicId: id,
            selectedItemId: item.id,
          };
        }),

      resetData: () =>
        set({ topics: clone(PLAN_TOPICS), selectedTopicId: null, selectedItemId: null, savedAt: Date.now() }),
      setLegendFocus: (f) => set({ legendFocus: f }),
      setView: (name) => set((s) => ({ view: { name, tick: s.view.tick + 1 } })),
    }),
    {
      name: 'rova3d-plan-v1',
      partialize: (s) => ({ topics: s.topics }),
    },
  ),
);

export const sortedTopics = (topics: PlanTopic[]) => [...topics].sort((a, b) => a.sortOrder - b.sortOrder);

export function useSelection() {
  const topics = usePlanStore((s) => s.topics);
  const topicId = usePlanStore((s) => s.selectedTopicId);
  const itemId = usePlanStore((s) => s.selectedItemId);
  const topic = topics.find((t) => t.id === topicId) ?? null;
  const item = topic?.items.find((i) => i.id === itemId) ?? topic?.items[0] ?? null;
  return { topic, item };
}

export function completionStats(topics: PlanTopic[]) {
  return { total: topics.length, complete: topics.filter((t) => t.status === 'complete').length };
}
