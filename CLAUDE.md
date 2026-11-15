# CLAUDE.md — Rova3D: תצוגת תוכנית בינוי תלת-ממדית
## הרובע המיוחד אשדוד | אדריכלית העיר: אד' ענת דוד שטיבלמן

---

## מה האפליקציה עושה

כלי עבודה מקצועי לאדריכלות העיר: מציג את תוכנית הבינוי של הרובע המיוחד אשדוד בתצוגה תלת-ממדית אינטראקטיבית, עם מקרא חומרים וסטטוס השלמה לכל נושא. **התוכנית עדיין בהכנה** — האפליקציה מאפשרת גם לסמן ולהשלים פריטים חסרים.

---

## Stack טכנולוגי

```
React 18 + TypeScript + Vite
React Three Fiber + Three.js  (תצוגה 3D)
@react-three/drei              (controls, environment, helpers)
Tailwind CSS v3                (RTL, dir="rtl")
Zustand                        (state management)
Lucide React                   (אייקונים)
```

> **הערה לבנייה:** ממשק מלא בעברית, RTL, ללא אמוג'י, ללא צבע ללא תפקיד. לבן + שחור + צבע-תפקיד בלבד.

---

## פריסת מסך (Layout)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: כותרת פרויקט + badge סטטוס + כפתורי view       │
├──────────────┬──────────────────────────────────────────┤
│  TOPIC BAR   │                                           │
│  (vertical   │         3D VIEWPORT (2/3 width)          │
│   sidebar)   │         React Three Fiber canvas          │
│              │         orbit controls + grid             │
│  ריצוף       ├──────────────────────────────────────────┤
│  תאורה       │                                           │
│  ריהוט       │         SPEC PANEL (1/3 width)            │
│  נטיעות      │         תמונה + שם + מקרא + סטטוס         │
│  מים         │                                           │
│  נגישות      │                                           │
│  חומרים      │                                           │
│  [+ הוסף]    │                                           │
└──────────────┴───────────────────────────────────────────┘
```

**חלוקה מדויקת:**
- Sidebar נושאים: `w-56` (קבוע)
- Viewport 3D: `flex-1` (ימין, שני שליש)
- Spec Panel: `w-80` (שמאל מוחלק מה-viewport, שליש)

כלומר: `sidebar | [viewport (2/3) | spec-panel (1/3)]`

---

## מסכים ומצבים

### מסך 1 — Main View (ברירת מחדל)
- Viewport 3D עם מודל placeholder של רחוב עירוני
- Sidebar עם כל הנושאים, הנבחר מודגש
- Spec Panel מציג את המקרא של הנושא הנבחר
- כפתור מצב Edit (עגלגל, פינה עליונה שמאלית)

### מסך 2 — Empty / Welcome State
- כשאין נושא נבחר: Viewport עם המודל, Spec Panel מציג כרטיס ברכה:
  ```
  תוכנית בינוי — הרובע המיוחד
  [badge] 5/7 נושאים הושלמו
  בחרי נושא מהסרגל להצגת המפרט
  ```

### מסך 3 — Spec Panel: פריט מלא
```
┌─────────────────────────────┐
│ [תמונה 240px × 160px]       │
│                             │
│ **שם החומר / הפריט**        │
│ תיאור קצר + פרמטרים         │
│                             │
│ ══ מקרא ══                  │
│ [■] #E8DCC8  פורפירו בהיר   │
│ [■] #C4A882  פורפירו כהה    │
│ [■] #8B6F4E  מסגרת גרניט    │
│                             │
│ [i] שם לטיני / מק"ט        │
└─────────────────────────────┘
```

### מסך 4 — Spec Panel: פריט חסר (להשלמה)
```
┌─────────────────────────────┐
│ [placeholder אפור 240×160]  │
│                             │
│ **תאורה — פרק 5**           │
│                             │
│  ⚠ ממתין להשלמה            │
│  הפרק טרם הוגש              │
│                             │
│ [+ השלם פרק זה]  (עט)      │
└─────────────────────────────┘
```

### מסך 5 — Edit Mode (Admin)
- Overlay על ה-Spec Panel
- שדות: שם, תיאור, העלאת תמונה, צבעי מקרא, שם לטיני
- כפתורי שמירה / ביטול
- כפתור "סמן כהושלם" / "סמן להשלמה"
- רק כשהמשתמש לחץ על כפתור עט

### מסך 6 — 3D Layer Toggle
- כשמחליפים נושא ב-sidebar: שכבת ה-3D מתחלפת (fade)
- כל נושא מדגיש אלמנטים אחרים במודל:
  - ריצוף: צבעי המשטחים
  - תאורה: גופי תאורה (wireframe צהוב)
  - נטיעות: נקודות ירוקות על עמדות עצים
  - ריהוט: קוביות כחולות עבור ספסלים/פחים

---

## מבנה קבצים

```
src/
├── App.tsx
├── main.tsx
├── index.css              (RTL + Tailwind)
│
├── store/
│   └── planStore.ts       (Zustand — topic selected, edit mode, data)
│
├── data/
│   └── planData.ts        (נתוני תוכנית הבינוי — ראו מבנה נתונים)
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── TopicSidebar.tsx
│   │   └── AppLayout.tsx
│   │
│   ├── viewport/
│   │   ├── Viewport3D.tsx      (R3F Canvas wrapper)
│   │   ├── CityModel.tsx       (מודל עירוני placeholder)
│   │   ├── LayerOverlay.tsx    (שכבות לפי נושא)
│   │   └── ViewControls.tsx    (כפתורי zoom/reset/top-view)
│   │
│   ├── spec/
│   │   ├── SpecPanel.tsx       (wrapper panel)
│   │   ├── SpecHeader.tsx      (תמונה + שם)
│   │   ├── SpecLegend.tsx      (מקרא צבעים)
│   │   ├── SpecEmpty.tsx       (empty state)
│   │   ├── SpecPending.tsx     (להשלמה state)
│   │   └── SpecEditForm.tsx    (edit mode form)
│   │
│   └── ui/
│       ├── Badge.tsx           (סטטוס badge)
│       ├── ColorSwatch.tsx     (ריבוע צבע במקרא)
│       └── StatusIcon.tsx      (✓ / ⚠ / ○)
│
└── types/
    └── plan.ts
```

---

## מבנה נתונים (`src/types/plan.ts`)

```typescript
export type ItemStatus = 'complete' | 'pending' | 'partial';

export interface LegendEntry {
  color: string;        // hex
  label: string;        // שם בעברית
  latinName?: string;   // לצמחים: שם לטיני
  code?: string;        // מק"ט / קטלוג
}

export interface SpecItem {
  id: string;
  nameHe: string;
  description?: string;
  image?: string;       // URL או undefined (placeholder)
  legend: LegendEntry[];
  status: ItemStatus;
  note?: string;        // הערה / "להשלמה"
  specRef?: string;     // מקור: "עמ' 21", "עמ' 14" וכו'
}

export interface PlanTopic {
  id: string;
  nameHe: string;
  iconName: string;     // lucide icon name
  status: ItemStatus;
  items: SpecItem[];
  layerColor?: string;  // צבע שכבת 3D
  sortOrder: number;
}
```

---

## נתוני תוכנית הבינוי (`src/data/planData.ts`)

```typescript
// נתוני ברירת מחדל — מבוסס על תוכנית הבינוי הרובע המיוחד אשדוד
export const PLAN_TOPICS: PlanTopic[] = [
  {
    id: 'paving',
    nameHe: 'ריצוף',
    iconName: 'Grid3x3',
    status: 'complete',
    layerColor: '#E8DCC8',
    sortOrder: 1,
    items: [
      {
        id: 'paving-main',
        nameHe: 'ריצוף רחוב ראשי',
        description: 'פורפירו שפוך — השראת חולות אשדוד. 280 ₪/מ"ר',
        image: undefined,
        legend: [
          { color: '#E8DCC8', label: 'פורפירו בהיר — רחוב ראשי' },
          { color: '#C4A882', label: 'פורפירו כהה — גדה ומסגרת' },
          { color: '#8B6F4E', label: 'גרניט — פס מוליך' },
        ],
        status: 'complete',
        specRef: 'עמ\' 8–12',
      },
      {
        id: 'paving-secondary',
        nameHe: 'ריצוף רחוב משני',
        description: 'ריצוף מגורים — 110 ₪/מ"ר',
        image: undefined,
        legend: [
          { color: '#D4C8B0', label: 'ריצוף מגורים — גוון חול' },
          { color: '#B8A898', label: 'אבן מקומית — מסגרת' },
        ],
        status: 'complete',
        specRef: 'עמ\' 13–15',
      },
    ],
  },
  {
    id: 'planting',
    nameHe: 'נטיעות',
    iconName: 'Trees',
    status: 'complete',
    layerColor: '#4A7C59',
    sortOrder: 2,
    items: [
      {
        id: 'trees-main',
        nameHe: 'עצי קו ראשי',
        description: 'רווח 6 מ\' בין עצים. מינים ים-תיכוניים-חוליים.',
        image: undefined,
        legend: [
          { color: '#2D5A3D', label: 'עץ חרוב', latinName: 'Ceratonia siliqua' },
          { color: '#4A7C59', label: 'שיטה', latinName: 'Acacia sp.' },
          { color: '#6B9E6B', label: 'ברוש עמודי', latinName: 'Cupressus sempervirens' },
        ],
        status: 'complete',
        specRef: 'עמ\' 16–18',
      },
      {
        id: 'groundcover',
        nameHe: 'כיסוי קרקע ו-Bioswales',
        description: 'צמחיית בתה ים-תיכונית-חולית בגדות ביוסוואלס.',
        image: undefined,
        legend: [
          { color: '#7CB87C', label: 'Pennisetum setaceum', latinName: 'Pennisetum setaceum' },
          { color: '#8FC88F', label: 'Muhlenbergia capillaris', latinName: 'Muhlenbergia capillaris' },
          { color: '#A8D4A8', label: 'Gaura lindheimeri', latinName: 'Gaura lindheimeri' },
          { color: '#C0E0C0', label: 'Bulbine frutescens', latinName: 'Bulbine frutescens' },
          { color: '#D8F0D8', label: 'לענה', latinName: 'Artemisia arborescens' },
        ],
        status: 'complete',
        specRef: 'עמ\' 19–20',
      },
    ],
  },
  {
    id: 'lighting',
    nameHe: 'תאורה',
    iconName: 'Lightbulb',
    status: 'pending',
    layerColor: '#F5C842',
    sortOrder: 3,
    items: [
      {
        id: 'lighting-main',
        nameHe: 'תאורת רחוב',
        description: '',
        image: undefined,
        legend: [],
        status: 'pending',
        note: 'פרק תאורה — חותמת "להשלמה" (עמ\' 21)',
        specRef: 'עמ\' 21',
      },
    ],
  },
  {
    id: 'furniture',
    nameHe: 'ריהוט רחוב',
    iconName: 'Armchair',
    status: 'pending',
    layerColor: '#6B8CAE',
    sortOrder: 4,
    items: [
      {
        id: 'furniture-main',
        nameHe: 'ריהוט — כללי',
        description: '',
        image: undefined,
        legend: [],
        status: 'pending',
        note: '"יעודכן בתכנון מפורט" — טרם נקבע',
        specRef: 'עמ\' 23',
      },
    ],
  },
  {
    id: 'planting-pits',
    nameHe: 'פתחי נטיעה',
    iconName: 'Circle',
    status: 'pending',
    layerColor: '#8B6F4E',
    sortOrder: 5,
    items: [
      {
        id: 'pits-main',
        nameHe: 'ספציפיקציית בורות נטיעה',
        description: '',
        image: undefined,
        legend: [],
        status: 'pending',
        note: 'פרק פתחי נטיעה — חותמת "להשלמה" (עמ\' 22)',
        specRef: 'עמ\' 22',
      },
    ],
  },
  {
    id: 'water',
    nameHe: 'ניקוז ומים',
    iconName: 'Droplets',
    status: 'partial',
    layerColor: '#4A90D9',
    sortOrder: 6,
    items: [
      {
        id: 'bioswale',
        nameHe: 'Bioswale — ניהול נגר',
        description: 'רצועות SUDs לאורך ציר ראשי. עומק 20 ס"מ, רוחב 80 ס"מ.',
        image: undefined,
        legend: [
          { color: '#4A90D9', label: 'רצועת ביוסוואל — ניקוז' },
          { color: '#7AB8E8', label: 'אזור חדירת מים' },
        ],
        status: 'complete',
        specRef: 'עמ\' 19',
      },
    ],
  },
  {
    id: 'accessibility',
    nameHe: 'נגישות',
    iconName: 'Accessibility',
    status: 'pending',
    layerColor: '#E8734A',
    sortOrder: 7,
    items: [
      {
        id: 'accessibility-main',
        nameHe: 'מפרט נגישות — תקן 1918',
        description: '',
        image: undefined,
        legend: [],
        status: 'pending',
        note: 'תקן 1918 לא מוזכר במסמך — פרק חסר',
        specRef: 'חסר',
      },
    ],
  },
];
```

---

## Zustand Store (`src/store/planStore.ts`)

```typescript
import { create } from 'zustand';
import { PlanTopic, SpecItem } from '../types/plan';
import { PLAN_TOPICS } from '../data/planData';

interface PlanState {
  topics: PlanTopic[];
  selectedTopicId: string | null;
  selectedItemId: string | null;
  isEditMode: boolean;
  
  // actions
  selectTopic: (id: string) => void;
  selectItem: (id: string) => void;
  toggleEditMode: () => void;
  updateItem: (topicId: string, itemId: string, patch: Partial<SpecItem>) => void;
  addItem: (topicId: string, item: SpecItem) => void;
  
  // computed
  selectedTopic: () => PlanTopic | null;
  selectedItem: () => SpecItem | null;
  completionStats: () => { total: number; complete: number };
}
```

---

## Header (`src/components/layout/Header.tsx`)

**תוכן:**
- שמאל: שם הפרויקט `תוכנית בינוי — הרובע המיוחד אשדוד`
- מרכז: badge סטטוס `5/7 נושאים הושלמו` עם צבע תפקיד (ירוק/כתום)
- ימין: כפתורי view — `תצוגה עילית` | `פרספקטיבה` | `תצוגת רחוב`
- פינה ימנית: כפתור עט (Edit Mode toggle)

**עיצוב:** `bg-white border-b h-14 flex items-center px-6`

---

## TopicSidebar (`src/components/layout/TopicSidebar.tsx`)

```
w-56 | bg-gray-50 | border-l | h-full | overflow-y-auto | flex flex-col
```

**כל כפתור נושא:**
```
[אייקון] שם הנושא
                 [badge: ✓ / ⚠ / ○]
```

**מצבים:**
- `selected`: `bg-white shadow-sm border-r-2 border-black font-semibold`
- `complete`: badge ירוק
- `pending`: badge כתום עם ⚠
- `partial`: badge אפור

**בתחתית:** כפתור `+ הוסף נושא` (רק ב-Edit Mode)

---

## Viewport 3D (`src/components/viewport/Viewport3D.tsx`)

```typescript
// React Three Fiber Canvas
<Canvas
  camera={{ position: [0, 15, 20], fov: 45 }}
  style={{ background: '#F5F0EB' }}
>
  <ambientLight intensity={0.6} />
  <directionalLight position={[10, 20, 10]} intensity={0.8} />
  <OrbitControls enablePan enableZoom enableRotate />
  <Grid args={[40, 40]} cellColor="#D4C8B0" sectionColor="#A89880" />
  <Environment preset="city" />
  
  <CityModel activeLayer={selectedTopicId} />
  <LayerOverlay topic={selectedTopic} />
</Canvas>
```

**CityModel — placeholder:**
- רחוב ישר עם מדרכות (BoxGeometry)
- עצים כספירות ירוקות (SphereGeometry)
- ספסלים כקוביות כחולות
- גופי תאורה כגלינדרים צהובים
- **כל קבוצה עם `userData.layer = 'paving'` וכו'**

**LayerOverlay:**
- מקבל `activeLayer`
- מדגיש / מעמעם אלמנטים לפי שכבה פעילה
- צבע הדגשה = `layerColor` מה-topic

**ViewControls (כפתורים מעל ה-canvas):**
```
[⬆ עילית] [◈ פרספקטיבה] [→ רחוב]
```
כל כפתור קורא ל-`camera.position.set(...)` + `controls.target.set(...)`

---

## SpecPanel (`src/components/spec/SpecPanel.tsx`)

```
w-80 | bg-white | border-r | h-full | overflow-y-auto | flex flex-col
```

**מצבים:**
1. **אין נושא נבחר** → `<SpecEmpty />`
2. **נושא נבחר, פריטים מלאים** → `<SpecHeader /> + <SpecLegend />`
3. **נושא נבחר, פריט pending** → `<SpecPending />`
4. **Edit Mode פעיל** → `<SpecEditForm />`

**SpecHeader:**
```
<img src={item.image || placeholder} className="w-full h-40 object-cover" />
<h2 className="text-lg font-bold mt-3">{item.nameHe}</h2>
<p className="text-sm text-gray-600">{item.description}</p>
{item.specRef && <span className="text-xs text-gray-400">מקור: {item.specRef}</span>}
```

**SpecLegend:**
```typescript
legend.map(entry => (
  <div className="flex items-center gap-2 py-1">
    <div style={{ backgroundColor: entry.color }} className="w-5 h-5 rounded-sm border" />
    <span className="text-sm">{entry.label}</span>
    {entry.latinName && <span className="text-xs text-gray-400 italic">{entry.latinName}</span>}
  </div>
))
```

**SpecPending:**
```
[placeholder image אפור]
⚠ ממתין להשלמה
{item.note}
{isEditMode && <button>+ השלם פרק זה</button>}
```

---

## SpecEditForm (`src/components/spec/SpecEditForm.tsx`)

שדות בטופס:
- שם הפריט (input)
- תיאור (textarea)
- תמונה (file upload → base64 / URL)
- מקרא: רשימה דינמית של `{ color picker, label, latinName? }`
  - `+ הוסף פריט מקרא`
  - גרור לסידור מחדש
- מקור/עמוד (input)
- סטטוס: radio `מלא / חלקי / להשלמה`
- `[שמור]` `[ביטול]`

---

## Badge Component (`src/components/ui/Badge.tsx`)

```typescript
type BadgeVariant = 'complete' | 'pending' | 'partial';

const variants = {
  complete: 'bg-green-100 text-green-800',
  pending: 'bg-orange-100 text-orange-800',
  partial: 'bg-gray-100 text-gray-700',
};

// תוכן: ✓ | ⚠ | ○
```

---

## CSS גלובלי (`src/index.css`)

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

:root {
  font-family: 'Heebo', system-ui, sans-serif;
}

html, body, #root {
  height: 100%;
  direction: rtl;
  overflow: hidden;
}

/* Three.js canvas מלא */
.viewport-canvas canvas {
  display: block !important;
}
```

---

## סדר בנייה מומלץ

1. **שלב 1 — Scaffolding**
   - `npm create vite@latest rova3d -- --template react-ts`
   - התקנת: `@react-three/fiber @react-three/drei three tailwindcss zustand lucide-react`
   - הגדרת RTL ב-`index.html`: `<html dir="rtl" lang="he">`
   - העתקת `planData.ts` ו-`types/plan.ts`

2. **שלב 2 — Layout**
   - `AppLayout.tsx` עם `Header + Sidebar + main-area`
   - `TopicSidebar` עם נתוני placeholder
   - `SpecPanel` עם empty state

3. **שלב 3 — 3D**
   - `Viewport3D` עם R3F Canvas
   - `CityModel` placeholder (קוביות + ספירות)
   - OrbitControls + Grid + תאורה
   - ViewControls (3 כפתורי מצלמה)

4. **שלב 4 — Spec Panel**
   - חיבור Zustand
   - `SpecHeader + SpecLegend`
   - `SpecPending` state
   - מעבר בין נושאים

5. **שלב 5 — Layer Highlighting**
   - `LayerOverlay` — fade שכבות לפי נושא נבחר
   - צבע הדגשה מה-`layerColor`

6. **שלב 6 — Edit Mode**
   - כפתור עט ב-Header
   - `SpecEditForm`
   - שמירה ב-Zustand (ב-localStorage לאורך זמן)

7. **שלב 7 — Polish**
   - אנימציית Fade בין נושאים
   - Badge סטטוס ב-Header
   - Responsive (אם נדרש)

---

## הערות מקצועיות לתוכנית

> תוכנית הבינוי לרחבי הרובע המיוחד **אינה סופית**.
> הפרקים הבאים מסומנים **להשלמה** ויש לעקוב אחר קבלתם:
>
> | פרק | עמוד | סטטוס |
> |-----|------|--------|
> | תאורה | 21 | ⚠ חסר |
> | פתחי נטיעה | 22 | ⚠ חסר |
> | ריהוט רחוב | 23 | ⚠ ממתין לתכנון מפורט |
> | נגישות (תקן 1918) | — | ⚠ לא הוזכר |
>
> **הפניה:** תוכנית בינוי — הרובע המיוחד אשדוד, HOA / סירקין-בוכנר-קורנברג / ppl / היסיגמא / שדות

---

## URL ומסמכים קשורים

- מסמך הכנה לישיבה: https://claude.ai/artifact/2SHwVYbNVLU1UCkAT6hzyY
- תוכנית בינוי PDF: `603-0811588_הוראות התכנית_1.pdf`

---

*נוצר עבור אד' ענת דוד שטיבלמן | אדריכלית העיר אשדוד*
*Claude Code — Rova3D planning document*

---

## מה נבנה בפועל, וסטיות מהאפיון (15.11.2026)

הרצה: `npm install`, `npm run dev`. בנייה: `npm run build` (תיקיית `dist`).

1. **בלי אייקונים.** לפי הכלל הקבוע ב-Claude-GH, אין Lucide ואין סימני וי או אזהרה. סטטוס מוצג במילה ובצבע: הושלם, חלקי, להשלמה. השדה `iconName` ירד מהטיפוסים.
2. **המודל נגזר מהנתונים.** כל חלק ב-`src/data/sceneData.ts` משויך לנושא, לפריט ולשורה במקרא. שינוי צבע במקרא משנה את המודל מיד.
3. **פרק חסר נראה במודל.** פריט בסטטוס "להשלמה" מוצג בקווי מתאר בלבד. כשמשלימים אותו, החלקים מתמלאים בצבע.
4. **המקרא הוא בורר.** מעבר על שורה במקרא מבודד את החומר במודל. לחיצה על חלק במודל פותחת את המפרט שלו.
5. **שמירה אוטומטית.** כל שינוי בטופס העריכה נשמר מיד ב-localStorage (מפתח `rova3d-plan-v1`). "ביטול השינויים" מחזיר את הפריט למצבו בפתיחת הטופס.
6. **תפריט אחד.** הכפתור "ר3" בסרגל העליון מחזיק את מצב העריכה, את הקישור למסמך ההכנה ואת האיפוס לנתוני המקור.
7. **בלי `Environment` ובלי `Grid`.** התאורה מקומית, כדי שהמודל לא יהיה תלוי בהורדת קובץ מהרשת, והצבעים זהים לצבעי המקרא (`flat`).
8. `LayerOverlay.tsx` הוחלף ב-`viewport/layerStyle.ts`: פונקציה אחת שקובעת צבע, שקיפות וקווי מתאר לכל חלק.
9. **המונה בסרגל מחושב מהנתונים** (כרגע 2 מתוך 7), ולא הדוגמה "5/7" שבאפיון.

עוד לא נבנה: הקלטה ותמלול בשדות הכתיבה, מחיקת נושא או פריט, ומודל אמיתי של הרובע במקום ה-placeholder.
