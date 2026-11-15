export type ItemStatus = 'complete' | 'pending' | 'partial';

export interface LegendEntry {
  color: string; // hex
  label: string; // שם בעברית
  latinName?: string; // לצמחים: שם לטיני
  code?: string; // מק"ט / קטלוג
  image?: string; // תמונה של המין או החומר
  credit?: string; // צלם ורישיון
}

/** אזור צבע במודל: רצועה בחתך הרחוב שהחלופה צובעת */
export interface ColorZone {
  zoneId: string; // 'walk' | 'service' | 'parking' | 'path'
  color: string; // hex, נדגם מהמצגת
  label: string;
}

/** חלופת תכנון שהציג צוות התכנון, לבחירת אדריכלית העיר */
export interface PlanAlternative {
  id: string;
  label: string; // "חלופה 1"
  title: string; // שם החלופה במצגת
  image: string; // השקף מהמצגת
  description: string;
  colorZones: ColorZone[];
  cost?: string;
  costLevel?: 1 | 2 | 3; // דרגת העלות במצגת, מתוך 3
  streets?: string; // לאילו רחובות החלופה מיועדת
  recommended?: boolean; // המלצת האדריכל, רק אם סומנה במצגת
  note?: string;
}

export interface SpecItem {
  id: string;
  nameHe: string;
  description?: string;
  image?: string; // כתובת או data-url. בלי תמונה: גרפיקה מצבעי המקרא
  imageCredit?: string; // צלם ורישיון
  legend: LegendEntry[];
  status: ItemStatus;
  note?: string; // הערה / "להשלמה"
  specRef?: string; // מקור: "עמ' 21"
  alternatives?: PlanAlternative[];
  selectedAlternativeId?: string;
}

/** דרישה שכבר קבועה בהוראות התכנית המאושרת */
export interface StatutoryRule {
  text: string;
  ref: string; // סעיף בהוראות התכנית
}

export interface PlanTopic {
  id: string;
  nameHe: string;
  status: ItemStatus;
  items: SpecItem[];
  layerColor?: string; // צבע שכבת התלת-ממד
  sortOrder: number;
  statutory?: StatutoryRule[];
}

export type CameraView = 'top' | 'perspective' | 'street';

type Ring = [number, number][]; // מטרים, יחסית למרכז התכנית. x מזרח, y צפון

/** תא שטח מתוך קובצי התכנית 603-0811588, עם שורת הזכויות שלו מטבלה 5 */
export interface QuarterLot {
  num: string;
  ring: Ring;
  calcArea: number; // מ"ר מחושב
  lotArea: number | null; // מ"ר בטבלה
  mixed: boolean; // מגורים עם חזית מסחרית
  coverage: number; // תכסית, אחוז מתא השטח
  units: number; // יח"ד, כולל התוספת של עד 20%
  density: number; // יח"ד לדונם
  height: number; // גובה מבנה מעל הכניסה הקובעת, מ'
  floors: number; // קומות מעל הכניסה הקובעת
  floorsBelow: number | null;
  mainArea: number | null; // שטח עיקרי למגורים, מ"ר
  commerceMain: number | null; // שטח עיקרי למסחר, מ"ר
  totalPct: number; // אחוזי בנייה כוללים
}

export interface QuarterData {
  origin: [number, number]; // רשת ישראל החדשה
  lots: QuarterLot[];
  easements: Ring[];
  buildingLines: Ring[];
  commercialFronts: Ring[];
}

/** הקונטקסט העירוני: רחובות ורובעים מהאפליקציה RechovNumbers, ואריחי תצלום אוויר */
export interface ContextData {
  streets: { n: string; q: string | null; w: number; l: Ring[] }[];
  quarters: { id: string; name: string; c: [number, number] }[];
  /** קטעי הרחובות שלצד מגרשי התכנית, בדגימה כל 6 מ' */
  planRuns: { n: string; main: boolean; w: number; pts: Ring }[];
  tiles: { z: number; x: number; y: number; c: Ring }[];
}

export type ContextMode = 'schematic' | 'satellite' | 'none';
