import type { PublicKind } from '../types/plan';

export const KIND: Record<PublicKind, { name: string; color: string; built: boolean }> = {
  public: { name: 'מבנים ומוסדות ציבור', color: '#A8754F', built: true },
  education: { name: 'מבנים ומוסדות ציבור לחינוך', color: '#7E5A8C', built: true },
  dorms: { name: 'דיור מיוחד: מעונות ומסחר', color: '#C9A227', built: true },
  mixed: { name: 'מסחר ותעסוקה', color: '#5E7FA8', built: true },
  facility: { name: 'מתקנים הנדסיים', color: '#8FA8D8', built: true },
  open: { name: 'שטח ציבורי פתוח', color: '#A9D46B', built: false },
  forest: { name: 'יער פארק חופי', color: '#DDE3A6', built: false },
  openland: { name: 'שטחים פתוחים', color: '#9FD49A', built: false },
};
