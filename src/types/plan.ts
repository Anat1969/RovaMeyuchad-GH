export type ItemStatus = 'complete' | 'pending' | 'partial';

export interface LegendEntry {
  color: string; // hex
  label: string; // שם בעברית
  latinName?: string; // לצמחים: שם לטיני
  code?: string; // מק"ט / קטלוג
}

export interface SpecItem {
  id: string;
  nameHe: string;
  description?: string;
  image?: string; // כתובת או data-url. בלי תמונה: גרפיקה מצבעי המקרא
  legend: LegendEntry[];
  status: ItemStatus;
  note?: string; // הערה / "להשלמה"
  specRef?: string; // מקור: "עמ' 21"
}

export interface PlanTopic {
  id: string;
  nameHe: string;
  status: ItemStatus;
  items: SpecItem[];
  layerColor?: string; // צבע שכבת התלת-ממד
  sortOrder: number;
}

export type CameraView = 'top' | 'perspective' | 'street';
