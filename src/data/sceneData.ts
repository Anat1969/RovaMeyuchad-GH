// מודל placeholder של רחוב עירוני: ציר ראשי לאורך X, רחוב משני חוצה.
// כל חלק משויך לנושא, לפריט ולשורה במקרא, ולכן הצבע שלו נגזר תמיד מנתוני התוכנית.

export type Shape = 'box' | 'sphere' | 'cone' | 'cyl';

export interface Piece {
  id: string;
  layer: string; // מזהה נושא, או 'context' לבינוי הסובב
  item?: string;
  idx?: number; // שורה במקרא
  shape: Shape;
  pos: [number, number, number];
  size: [number, number, number];
  fixed?: string; // צבע קבוע (גזע, בניין)
}

const pieces: Piece[] = [];
let n = 0;
const add = (p: Omit<Piece, 'id'>) => pieces.push({ ...p, id: `p${n++}` });

const SIDES = [1, -1];
// שני מקטעים לאורך הציר, משני צדי הרחוב החוצה (x בין 5.5 ל-10.5)
const SEGMENTS: [number, number][] = [
  [-22, 5.5],
  [10.5, 22],
];
const inGap = (x: number) => x > 5 && x < 11;

// ריצוף רחוב ראשי
add({ layer: 'paving', item: 'paving-main', idx: 0, shape: 'box', pos: [0, 0.05, 0], size: [44, 0.1, 7.6] });
for (const s of SIDES) {
  add({ layer: 'paving', item: 'paving-main', idx: 1, shape: 'box', pos: [0, 0.07, s * 4.2], size: [44, 0.14, 0.8] });
  add({ layer: 'paving', item: 'paving-main', idx: 2, shape: 'box', pos: [0, 0.065, s * 2.4], size: [44, 0.13, 0.3] });
}

for (const s of SIDES) {
  for (const [a, b] of SEGMENTS) {
    const len = b - a;
    const cx = (a + b) / 2;
    // רצועת ביוסוואל
    add({ layer: 'water', item: 'bioswale', idx: 0, shape: 'box', pos: [cx, 0.02, s * 5.3], size: [len, 0.04, 1.4] });
    // מדרכה: ריצוף מגורים ומסגרת
    add({ layer: 'paving', item: 'paving-secondary', idx: 0, shape: 'box', pos: [cx, 0.08, s * 7.5], size: [len, 0.16, 3] });
    add({ layer: 'paving', item: 'paving-secondary', idx: 1, shape: 'box', pos: [cx, 0.09, s * 9.15], size: [len, 0.18, 0.3] });
  }
  // אזורי חדירת מים
  for (const x of [-18, -6, 16]) {
    add({ layer: 'water', item: 'bioswale', idx: 1, shape: 'box', pos: [x, 0.035, s * 5.3], size: [3, 0.05, 1] });
  }
  // רחוב משני חוצה
  add({ layer: 'paving', item: 'paving-secondary', idx: 0, shape: 'box', pos: [8, 0.05, s * 12.3], size: [5, 0.1, 15.4] });
  for (const e of SIDES) {
    add({ layer: 'paving', item: 'paving-secondary', idx: 1, shape: 'box', pos: [8 + e * 2.65, 0.07, s * 12.3], size: [0.3, 0.14, 15.4] });
  }
}

// בינוי סובב: מסות לבנות
const BLOCKS: [number, number, number, number][] = [
  // מרכז x, רוחב, גובה בצד הקרוב למצלמה (נמוך, כדי לא להסתיר את הרחוב), גובה בצד הרחוק
  [-15, 12, 4.5, 15],
  [-1.25, 11.5, 6, 12],
  [16.75, 10.5, 4.5, 21],
];
for (const [cx, w, h1, h2] of BLOCKS) {
  add({ layer: 'context', shape: 'box', pos: [cx, h1 / 2, 14], size: [w, h1, 8], fixed: '#FFFFFF' });
  add({ layer: 'context', shape: 'box', pos: [cx, h2 / 2, -14], size: [w, h2, 8], fixed: '#FFFFFF' });
}

// עצי קו ראשי: כל 6 מ', שלושה מינים לסירוגין. סביב כל עץ פתח נטיעה
const TREE_X = [-21, -15, -9, -3, 3, 15, 21];
for (const s of SIDES) {
  TREE_X.forEach((x, i) => {
    const kind = (i + (s > 0 ? 0 : 1)) % 3;
    const z = s * 5.3;
    add({ layer: 'planting-pits', item: 'pits-main', idx: 0, shape: 'box', pos: [x, 0.07, z], size: [1.6, 0.06, 1.6] });
    if (kind === 2) {
      // ברוש עמודי
      add({ layer: 'planting', item: 'trees-main', shape: 'cyl', pos: [x, 0.4, z], size: [0.14, 0.8, 0.14], fixed: '#7A6652' });
      add({ layer: 'planting', item: 'trees-main', idx: 2, shape: 'cone', pos: [x, 3.5, z], size: [0.85, 5.6, 0.85] });
    } else {
      add({ layer: 'planting', item: 'trees-main', shape: 'cyl', pos: [x, 1.2, z], size: [0.16, 2.4, 0.16], fixed: '#7A6652' });
      const crown: [number, number, number] = kind === 0 ? [1.7, 1.5, 1.7] : [2.1, 1, 2.1];
      add({ layer: 'planting', item: 'trees-main', idx: kind, shape: 'sphere', pos: [x, 3.6, z], size: crown });
    }
    // כיסוי קרקע בגדות הביוסוואל, בין העצים
    for (let k = 0; k < 3; k++) {
      const gx = x + 2 + k;
      if (gx > 22 || inGap(gx) || inGap(gx + 0.5)) continue;
      add({
        layer: 'planting',
        item: 'groundcover',
        idx: (i * 3 + k + (s > 0 ? 0 : 2)) % 5,
        shape: 'sphere',
        pos: [gx, 0.22, z + (k % 2 ? 0.25 : -0.25)],
        size: [0.42, 0.3, 0.42],
      });
    }
  });
}

// תאורת רחוב
for (const s of SIDES) {
  for (const x of [-18, -6, 13]) {
    const z = s * 6.4;
    add({ layer: 'lighting', item: 'lighting-main', idx: 0, shape: 'cyl', pos: [x, 2.6, z], size: [0.09, 5.2, 0.09] });
    add({ layer: 'lighting', item: 'lighting-main', idx: 0, shape: 'box', pos: [x, 5.15, z - s * 0.8], size: [0.1, 0.1, 1.7] });
    add({ layer: 'lighting', item: 'lighting-main', idx: 0, shape: 'box', pos: [x, 5.08, z - s * 1.6], size: [0.55, 0.14, 0.35] });
  }
}

// ריהוט רחוב: ספסלים ואשפתונים
for (const s of SIDES) {
  for (const x of [-12, 0, 18]) {
    add({ layer: 'furniture', item: 'furniture-main', idx: 0, shape: 'box', pos: [x, 0.36, s * 3.3], size: [1.8, 0.45, 0.5] });
    add({ layer: 'furniture', item: 'furniture-main', idx: 1, shape: 'cyl', pos: [x + 1.5, 0.5, s * 3.3], size: [0.22, 0.8, 0.22] });
  }
}

// נגישות: משטחי אזהרה בפתח הרחוב החוצה, ומעבר חצייה
for (const s of SIDES) {
  add({ layer: 'accessibility', item: 'accessibility-main', idx: 0, shape: 'box', pos: [8, 0.12, s * 4.95], size: [5, 0.22, 0.6] });
}
for (const x of [6.8, 8, 9.2]) {
  add({ layer: 'accessibility', item: 'accessibility-main', idx: 1, shape: 'box', pos: [x, 0.09, 0], size: [0.6, 0.16, 7] });
}

export const SCENE_PIECES: Piece[] = pieces;
