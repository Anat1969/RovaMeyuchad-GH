import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CameraView, ContextMode, ItemStatus, MassMode, PlanTopic, SpecItem } from '../types/plan';
import { PUBLIC } from '../data/publicData';

const PUBLIC_NUMS = new Set(PUBLIC.lots.map((l) => l.num));
import { PLAN_TOPICS, withAlternative } from '../data/planData';
import { SEED_TASKS, type Go, type PanelId } from '../data/insights';
import type { StageId } from '../data/stages';
import type { Analysis, Params } from '../analysis/engine';

/** משימה בתוכנית העבודה */
export interface WorkTask {
  id: string;
  date: string; // תאריך יעד, YYYY-MM-DD. ריק: עוד לא נקבע
  topic: string; // מזהה נושא, או 'general'
  text: string;
  done: boolean;
}

export type RenderMode = 'model' | 'real';
export type { Analysis } from '../analysis/engine';

const seedTasks = (): WorkTask[] =>
  SEED_TASKS.map((t, i) => ({ id: `seed-${i}`, date: '', topic: t.topic, text: t.text, done: false }));

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
  /** זום למלבן שסומן על המודל: מרכז המלבן (בקואורדינטות מסך מנורמלות) והיחס שלו לחלון */
  box: { nx: number; ny: number; scale: number; tick: number };
  contextMode: ContextMode;
  renderMode: RenderMode;
  massMode: MassMode; // מודל הזכויות, או מודל התכנון של האדריכל
  panel: PanelId | null; // לוח התובנות שפתוח בצד
  stage: StageId; // שלב העבודה: תב"ע, צרכים, תכנון, הערות
  setStage: (s: StageId) => void;
  terrain: boolean; // המודל יושב על הטופוגרפיה
  setTerrain: (b: boolean) => void;
  tasks: WorkTask[];
  lightbox: string | null;
  analysis: Analysis | null; // כלי הניתוח הפעיל: הצללות, רוח, ניקוז או חום
  analysisParams: Params;
  sunPlaying: boolean;
  appendix: string | null;
  customSheet: { img: string; name: string; cx: number; cy: number; w: number; h: number; angle: number } | null;
  setCustomSheet: (c: PlanState['customSheet']) => void; // תשריט נספח שפרוש על המודל
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
  cam: { pos: V3; target: V3; tick: number };
  camTo: (pos: V3, target: V3) => void;
  savedViews: { name: string; pos: V3; target: V3 }[];
  saveView: (v: { name: string; pos: V3; target: V3 }) => void;
  removeView: (i: number) => void;
  checks: Record<string, { done: boolean; note?: string; removed?: boolean }>;
  setCheck: (id: string, patch: { done?: boolean; note?: string; removed?: boolean }) => void;
  zoomBy: (dir: 1 | -1) => void;
  zoomToBox: (nx: number, ny: number, scale: number) => void;
  setContextMode: (m: ContextMode) => void;
  setRenderMode: (m: RenderMode) => void;
  setMassMode: (m: MassMode) => void;
  setPanel: (p: PanelId | null) => void;
  setLightbox: (src: string | null) => void;
  setAnalysis: (a: Analysis | null) => void;
  setAnalysisParams: (p: Partial<Params>) => void;
  setSunPlaying: (b: boolean) => void;
  setAppendix: (id: string | null) => void;
  /** קישור מתובנה אל המודל: בוחר נושא, פריט וחלופה. המצלמה לא זזה: המבט נשאר של המשתמשת */
  go: (g: Go) => void;
  addTask: (t: Omit<WorkTask, 'id' | 'done'>) => void;
  updateTask: (id: string, patch: Partial<WorkTask>) => void;
  removeTask: (id: string) => void;
}

export type V3 = [number, number, number];
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
      box: { nx: 0, ny: 0, scale: 1, tick: 0 },
      contextMode: 'schematic',
      renderMode: 'model',
      massMode: 'rights',
      panel: null,
      stage: 1,
      // מעבר שלב מנקה את מה שהיה פתוח, כדי שהמסך יציג רק את השלב החדש
      setStage: (st) => set({ stage: st, panel: null, analysis: null, appendix: null, selectedTopicId: null, selectedItemId: null, selectedLot: null, legendFocus: null }),
      terrain: true,
      setTerrain: (b) => set({ terrain: b }),
      tasks: seedTasks(),
      lightbox: null,
      analysis: null,
      analysisParams: { season: 'summer', hour: 10, windFrom: 315, day: false, windDay: true, design: true },
      sunPlaying: true,
      appendix: null,
      customSheet: null,
      setCustomSheet: (c) => set({ customSheet: c, appendix: c ? 'custom' : null }),
      savedAt: 0,

      selectTopic: (id, itemId) =>
        set((s) => {
          const topic = s.topics.find((t) => t.id === id) ?? null;
          return {
            selectedTopicId: topic?.id ?? null,
            selectedItemId: topic ? (itemId ?? topic.items[0]?.id ?? null) : null,
            legendFocus: null,
            selectedLot: topic?.id === 'massing' || topic?.id === 'public' ? s.selectedLot : null,
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
          tasks: seedTasks(),
          savedAt: Date.now(),
        }),
      setLegendFocus: (f) => set({ legendFocus: f }),
      // בחירת מגרש פותחת את נושא הבינוי, כדי שהכרטיס שלו יוצג
      selectLot: (num) =>
        set((s) =>
          num
            ? PUBLIC_NUMS.has(num)
              ? { selectedLot: num, selectedTopicId: 'public', selectedItemId: 'public-main', legendFocus: null, panel: null }
              : { selectedLot: num, selectedTopicId: 'massing', selectedItemId: 'massing-main', legendFocus: null, panel: null }
            : { selectedLot: null, selectedTopicId: s.selectedTopicId },
        ),
      setView: (name) => set((s) => ({ view: { name, tick: s.view.tick + 1 } })),
      cam: { pos: [0, 0, 0], target: [0, 0, 0], tick: 0 },
      camTo: (pos, target) => set((s) => ({ cam: { pos, target, tick: s.cam.tick + 1 } })),
      savedViews: [],
      saveView: (v) => set((s) => ({ savedViews: [...s.savedViews, v] })),
      removeView: (i) => set((s) => ({ savedViews: s.savedViews.filter((_, k) => k !== i) })),
      // סימוני "בוצע" והערות, לכל דרישה, מדד או הבדל, לפי מזהה
      checks: {},
      setCheck: (id, patch) => set((s) => ({ savedAt: Date.now(), checks: { ...s.checks, [id]: { ...(s.checks[id] ?? { done: false }), ...patch } } })),
      zoomBy: (dir) => set((s) => ({ zoom: { dir, tick: s.zoom.tick + 1 } })),
      zoomToBox: (nx, ny, scale) => set((s) => ({ box: { nx, ny, scale, tick: s.box.tick + 1 } })),
      setContextMode: (m) => set({ contextMode: m }),
      setRenderMode: (m) => set({ renderMode: m }),
      setMassMode: (m) => set({ massMode: m }),
      setPanel: (p) => set((s) => ({ panel: p, ...(p && { analysis: null }), appendix: p === 'appendix' ? s.appendix : null })),
      setLightbox: (src) => set({ lightbox: src }),
      setAnalysis: (a) => set({ analysis: a, ...(a && { panel: null, appendix: null }) }),
      setSunPlaying: (b) => set({ sunPlaying: b }),
      setAppendix: (id) => set({ appendix: id, analysis: null }),
      setAnalysisParams: (p) => set((s) => ({ analysisParams: { ...s.analysisParams, ...p } })),
      go: (g) =>
        set((s) => {
          let topics = s.topics;
          if (g.alt && g.topic && g.item) {
            topics = topics.map((t) =>
              t.id !== g.topic ? t : { ...t, items: t.items.map((i) => (i.id === g.item ? withAlternative(i, g.alt) : i)) },
            );
          }
          const topic = g.topic === undefined ? undefined : (topics.find((t) => t.id === g.topic) ?? null);
          return {
            topics,
            legendFocus: null,
            ...(topic !== undefined && {
              selectedTopicId: topic?.id ?? null,
              selectedItemId: topic ? (g.item ?? topic.items[0]?.id ?? null) : null,
              selectedLot: g.lot ?? null,
            }),
            ...(g.context && { contextMode: g.context }),
            ...(g.render && { renderMode: g.render }),
          };
        }),
      addTask: (t) => set((s) => ({ savedAt: Date.now(), tasks: [...s.tasks, { ...t, id: `t-${Date.now()}`, done: false }] })),
      updateTask: (id, patch) =>
        set((s) => ({ savedAt: Date.now(), tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ savedAt: Date.now(), tasks: s.tasks.filter((t) => t.id !== id) })),
    }),
    {
      name: 'rova3d-plan-v6',
      version: 2,
      // גרסה 1: פרקי הנטיעות עוברים ל"חלקי", כי במצגת הם מסומנים "יעודכן בתכנון מפורט". שאר העריכות נשמרות
      migrate: (old, v) => {
        const s = old as { topics?: PlanTopic[] };
        if (v < 1 && s.topics) {
          s.topics = s.topics.map((t) =>
            t.id !== 'planting' ? t : { ...t, status: 'partial', items: t.items.map((i) => (i.status === 'complete' ? { ...i, status: 'partial' as ItemStatus } : i)) },
          );
        }
        // גרסה 2: שבילים חוצי רובע קודמים לריצוף הרחובות
        if (v < 2 && s.topics) {
          s.topics = s.topics.map((t) => (t.id !== 'paving' ? t : { ...t, items: [...t.items].sort((a, b) => Number(b.id === 'paving-paths') - Number(a.id === 'paving-paths')) }));
        }
        return s as never;
      },
      partialize: (s) => ({ topics: s.topics, contextMode: s.contextMode, renderMode: s.renderMode, massMode: s.massMode, tasks: s.tasks, stage: s.stage, savedViews: s.savedViews, checks: s.checks }),
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

