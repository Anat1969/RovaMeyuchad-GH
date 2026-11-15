import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CameraView, ContextMode, ItemStatus, PlanTopic, SpecItem } from '../types/plan';
import { PLAN_TOPICS, withAlternative } from '../data/planData';

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
  selectedLot: string | null;
  view: { name: CameraView | 'detail'; tick: number };
  zoom: { dir: 1 | -1; tick: number };
  contextMode: ContextMode;
  savedAt: number;

  selectTopic: (id: string | null, itemId?: string) => void;
  selectItem: (id: string) => void;
  toggleEditMode: (on?: boolean) => void;
  updateItem: (topicId: string, itemId: string, patch: Partial<SpecItem>) => void;
  addItem: (topicId: string, item: SpecItem) => void;
  selectAlternative: (topicId: string, itemId: string, alternativeId: string) => void;
  addTopic: (nameHe: string) => void;
  resetData: () => void;
  setLegendFocus: (f: LegendFocus | null) => void;
  selectLot: (num: string | null) => void;
  setView: (name: CameraView) => void;
  zoomBy: (dir: 1 | -1) => void;
  setContextMode: (m: ContextMode) => void;
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
      selectedLot: null,
      view: { name: 'perspective', tick: 0 },
      zoom: { dir: 1, tick: 0 },
      contextMode: 'schematic',
      savedAt: 0,

      selectTopic: (id, itemId) =>
        set((s) => {
          const topic = s.topics.find((t) => t.id === id) ?? null;
          return {
            selectedTopicId: topic?.id ?? null,
            selectedItemId: topic ? (itemId ?? topic.items[0]?.id ?? null) : null,
            legendFocus: null,
            selectedLot: topic?.id === 'massing' ? s.selectedLot : null,
            // נושא פיתוח נפתח במבט קרוב על רחובות התוכנית. חזרה למבט הכולל מרחיקה שוב
            view:
              topic && topic.id !== 'massing' && s.selectedTopicId !== topic.id && s.view.name !== 'detail'
                ? { name: 'detail' as const, tick: s.view.tick + 1 }
                : !topic && s.view.name === 'detail'
                  ? { name: 'perspective' as const, tick: s.view.tick + 1 }
                  : s.view,
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

      // בחירת חלופה מחליפה את התמונה ואת המקרא, ולכן גם את צבעי המודל
      selectAlternative: (topicId, itemId, alternativeId) =>
        set((s) => ({
          savedAt: Date.now(),
          legendFocus: null,
          topics: s.topics.map((t) =>
            t.id !== topicId
              ? t
              : { ...t, items: t.items.map((i) => (i.id === itemId ? withAlternative(i, alternativeId) : i)) },
          ),
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
        set({
          topics: clone(PLAN_TOPICS),
          selectedTopicId: null,
          selectedItemId: null,
          selectedLot: null,
          savedAt: Date.now(),
        }),
      setLegendFocus: (f) => set({ legendFocus: f }),
      // בחירת מגרש פותחת את נושא הבינוי, כדי שהכרטיס שלו יוצג
      selectLot: (num) =>
        set((s) =>
          num
            ? { selectedLot: num, selectedTopicId: 'massing', selectedItemId: 'massing-main', legendFocus: null }
            : { selectedLot: null, selectedTopicId: s.selectedTopicId },
        ),
      setView: (name) => set((s) => ({ view: { name, tick: s.view.tick + 1 } })),
      zoomBy: (dir) => set((s) => ({ zoom: { dir, tick: s.zoom.tick + 1 } })),
      setContextMode: (m) => set({ contextMode: m }),
    }),
    {
      name: 'rova3d-plan-v4',
      partialize: (s) => ({ topics: s.topics, contextMode: s.contextMode }),
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
