export type ItemStatus = 'complete' | 'pending' | 'partial';

export interface LegendEntry {
  color: string; // hex
  label: string; // שם בעברית
  latinName?: string; // לצמחים: שם לטיני
  code?: string; // מק"ט / קטלוג
  image?: string; // תמונה של המין או החומר
  credit?: string; // צלם ורישיון
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
