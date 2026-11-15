import type { Analysis } from '../analysis/engine';
import type { PanelId } from './insights';

/** ארבעת שלבי העבודה. kind קובע את צבע התפקיד: סטטוטורי, צרכים, תכנון, הערות */
export type StageId = 1 | 2 | 3 | 4;
export interface Stage {
  id: StageId;
  name: string;
  hint: string;
  tag: string; // התווית שמופיעה על כל מידע מהשלב הזה
  color: string;
  what: string;
}
export const STAGES: Stage[] = [
  { id: 1, name: 'תב"ע', hint: 'מה מחייב: שכבות התכנית', tag: 'סטטוטורי', color: '#2B4C7E', what: 'מה שהתכניות המאושרות קובעות: מגרשים, זכויות ונספחים. מחייב או מנחה, לפי המסמך.' },
  { id: 2, name: 'צרכים', hint: 'אוכלוסיות, מדדים וניתוחים', tag: 'צרכים', color: '#3F7D55', what: 'מה המקום צריך: אוכלוסיות, 44 מדדי שכונה 360°, צל, רוח, ניקוז וחום.' },
  { id: 3, name: 'תכנון האדריכל', hint: 'תוכנית הבינוי והחלופות', tag: 'תכנון', color: '#B8642B', what: 'מה שצוות התכנון מציע בתוכנית הבינוי: נושאי הפיתוח, החלופות וחתכי הרחוב. עדיין בעבודה.' },
  { id: 4, name: 'הערות', hint: 'פערים, תיקונים ושליחה', tag: 'הערות', color: '#2E2E2B', what: 'מה יש, מה חסר ומה דורש תיקון, ומה נשלח לאדריכל.' },
];
export const stage = (id: StageId) => STAGES[id - 1];

const PANEL_STAGE: Record<PanelId, StageId> = {
  appendix: 1,
  people: 2,
  metrics: 2,
  section: 3,
  diff: 4,
  prep: 4,
  status: 4,
  proscons: 4,
  ideas: 4,
  work: 4,
  send: 4,
  reqs: 2,
  library: 4,
};
/** לאיזה שלב שייך מה שמוצג כרגע. null: אין מה שמכריע, והשלב נשאר */
export function stageOf(s: { analysis: Analysis | null; panel: PanelId | null; selectedTopicId: string | null }): StageId | null {
  if (s.analysis) return 2;
  if (s.panel) return PANEL_STAGE[s.panel];
  if (s.selectedTopicId) return s.selectedTopicId === 'massing' || s.selectedTopicId === 'public' ? 1 : 3;
  return null;
}
export const PANEL_NAME: Partial<Record<PanelId, string>> = {
  appendix: 'שכבות התב"ע',
  people: 'אוכלוסיות',
  reqs: 'תקנות, אוגדן והנחיות',
  library: 'ספרייה ועריכה',
  metrics: '44 מדדים',
  section: 'חתך רחוב',
  diff: 'תב"ע מול תכנון',
  prep: 'הכנה לישיבה',
  status: 'מה בוצע',
  proscons: 'יתרונות וחסרונות',
  ideas: 'הצעות לייעול',
  work: 'תוכנית עבודה',
  send: 'שליחה לאדריכל',
};
export const PANEL_HINT: Partial<Record<PanelId, string>> = {
  appendix: 'נספחים על המודל, שכבה שכבה',
  people: 'התאמה לזקנים ולילדים',
  reqs: 'דרישות שלא מתקיימות',
  library: 'מסמכים, קבצים ומקורות',
  metrics: '44 מדדי שכונה 360',
  section: 'חתך בקנה מידה',
  diff: 'איפה התכנון סוטה מהתב"ע',
  prep: 'עמדה, פערים ושאלות לישיבה',
  status: 'אילו פרקים הוגשו',
  proscons: 'חוזקות וסיכונים',
  ideas: 'צעדים לשיפור',
  work: 'משימות ותאריכים',
  send: 'הערות ומסמכים לאדריכל',
};
