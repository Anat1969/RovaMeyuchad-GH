# CLAUDE-alternatives.md — פיצ'ר: חלופות תכנון
## תוספת ל-Rova3D | הרובע המיוחד אשדוד

---

## מה מוסיפים

מצב "חלופות" לנושאי התכנון — בעיקר ריצוף.
המשתמשת רואה את החלופות שהציג האדריכל, עוברת ביניהן, ומחליטה.

---

## טיפוסים חדשים (`src/types/plan.ts` — הוסף לקיים)

```typescript
export interface PlanAlternative {
  id: string;
  label: string;           // "חלופה א׳" / "חלופה ב׳" / "חלופה ג׳"
  image: string;           // URL לתמונה שחולצה מהמצגת
  description: string;     // תיאור קצר — חומר, עקרון, יתרון
  colorZones?: ColorZone[]; // לצביעת ה-plan overlay ב-3D
  cost?: string;           // "280 ₪/מ״ר" — אופציונלי
  recommended?: boolean;   // האם זו המלצת האדריכל
}

export interface ColorZone {
  zoneId: string;    // מזהה אזור במודל 3D (userData.zone)
  color: string;     // hex
  label: string;     // "ציר ראשי" / "מדרכה" / "כיכר"
}

// עדכן את SpecItem הקיים — הוסף שדות:
// alternatives?: PlanAlternative[];
// selectedAlternativeId?: string;
```

---

## עדכון Zustand Store (`src/store/planStore.ts` — הוסף)

```typescript
// הוסף לממשק PlanState:
selectedAlternativeId: string | null;
selectAlternative: (topicId: string, itemId: string, alternativeId: string) => void;

// מימוש selectAlternative:
// מעדכן את selectedAlternativeId ב-SpecItem המתאים
// מפעיל צביעה מחדש של LayerOverlay לפי colorZones
```

---

## מבנה נתונים — ריצוף עם חלופות (`src/data/planData.ts`)

**החלף את פריט ריצוף-ראשי הקיים:**

```typescript
{
  id: 'paving-main',
  nameHe: 'ריצוף ציר ראשי',
  description: 'שלוש חלופות חומר — לבחירת אדריכלית העיר',
  image: undefined,          // יוחלף על-ידי תמונת החלופה הנבחרת
  legend: [],                // יוחלף דינמית לפי החלופה הנבחרת
  status: 'complete' as ItemStatus,
  selectedAlternativeId: 'alt-a',  // ברירת מחדל
  alternatives: [
    {
      id: 'alt-a',
      label: 'חלופה א׳',
      image: '',             // ← Claude Code ימלא מהמצגת
      description: 'פורפירו שפוך — השראת חולות אשדוד. מרקם אורגני, 280 ₪/מ״ר',
      recommended: true,
      colorZones: [
        { zoneId: 'main-axis', color: '#E8DCC8', label: 'ציר ראשי' },
        { zoneId: 'sidewalk',  color: '#C4A882', label: 'מדרכה' },
        { zoneId: 'border',    color: '#8B6F4E', label: 'מסגרת' },
      ],
    },
    {
      id: 'alt-b',
      label: 'חלופה ב׳',
      image: '',             // ← Claude Code ימלא מהמצגת
      description: '',       // ← Claude Code ימלא מהמצגת
      colorZones: [],
    },
    {
      id: 'alt-c',
      label: 'חלופה ג׳',
      image: '',             // ← Claude Code ימלא מהמצגת
      description: '',
      colorZones: [],
    },
  ],
},
```

---

## UI — SpecPanel עם חלופות (`src/components/spec/SpecAlternatives.tsx`)

**קומפוננט חדש — הכנס מעל SpecLegend כשקיימות חלופות:**

```
┌─────────────────────────────────┐
│  [תמונת החלופה הנבחרת — 240px] │
│                                 │
│  חלופה א׳ — פורפירו שפוך       │
│  פורפירו שפוך, מרקם אורגני...  │
│  280 ₪/מ״ר                     │
│                                 │
│  ══ בחרי חלופה ══               │
│  [א׳ ★] [ב׳] [ג׳]              │  ← tabs, ★ = המלצת אדריכל
│                                 │
│  ══ מקרא ══                     │
│  [■] ציר ראשי                   │
│  [■] מדרכה                      │
│  [■] מסגרת                      │
└─────────────────────────────────┘
```

**כללי עיצוב:**
- כרטיסיות: `flex gap-2 | כל כרטיסייה: px-3 py-1 rounded border`
- נבחרת: `bg-black text-white`
- לא נבחרת: `bg-white text-gray-700 border-gray-300`
- תג המלצה: `★` קטן בצבע זהב ליד הטאב
- מעבר בין חלופות: `transition-opacity duration-300`

---

## עדכון 3D Overlay (`src/components/viewport/LayerOverlay.tsx`)

**כשמחליפים חלופה — ה-3D canvas מגיב:**

```typescript
// LayerOverlay מקבל גם: activeAlternative?: PlanAlternative
// כשיש colorZones — עובר על scene.children
// ומעדכן צבע לפי userData.zone === colorZone.zoneId

scene.traverse((obj) => {
  if (obj.userData.zone && activeAlternative?.colorZones) {
    const zone = activeAlternative.colorZones
      .find(z => z.zoneId === obj.userData.zone);
    if (zone && obj instanceof Mesh) {
      (obj.material as MeshStandardMaterial).color
        .set(zone.color);
    }
  }
});
```

**בסרגל הצדדי (TopicSidebar):**
כשנושא הריצוף נבחר ויש חלופות — מוסיפים שורה קטנה:
`חלופה א׳ ★` (מה שנבחר כרגע)

---

## הוראות לחילוץ תמונות מהמצגת

**כשמקבלים את קובץ המצגת (PDF/PPTX):**

1. **זהה** את השקפים עם חלופות ריצוף (בדרך כלל 3–4 שקפים רצופים עם "חלופה א׳ / ב׳ / ג׳")
2. **חלץ** כל שקף כתמונה: `convert presentation.pdf[page] alt-a.png`
3. **שמור** ב-`public/alternatives/`
4. **עדכן** `planData.ts` עם: `image: '/alternatives/alt-a.png'`
5. **מלא** `description` מהטקסט שבשקף
6. **הסק** `colorZones` מצבעי הריצוף שבשקף (picker אם צריך)

---

## סדר בנייה לפיצ'ר הזה

1. הוסף `PlanAlternative` ו-`ColorZone` ל-`types/plan.ts`
2. עדכן `SpecItem` בהוספת `alternatives[]` + `selectedAlternativeId`
3. עדכן `planStore` — הוסף `selectAlternative`
4. בנה `SpecAlternatives.tsx`
5. שלב בתוך `SpecPanel` — מעל `SpecLegend`
6. עדכן `LayerOverlay` לקבל `activeAlternative`
7. חלץ תמונות מהמצגת ומלא את `planData.ts`
8. הוסף `userData.zone` לאלמנטי הרצפה ב-`CityModel`

---

## הוראה ל-Claude Code

```
הוסף פיצ'ר "חלופות תכנון" ל-Rova3D לפי CLAUDE-alternatives.md.

קובץ המצגת מצורף.
חלץ ממנו:
- את תמונות שקפי החלופות (ריצוף)
- את שמות החלופות ותיאוריהן
- את צבעי הריצוף המרכזיים לכל חלופה

שמור תמונות ב-public/alternatives/ ועדכן את planData.ts.

שמור על כל הקוד הקיים — זו תוספת, לא החלפה.
```

---

*תוספת לתכנון Rova3D | אד' ענת דוד שטיבלמן*
