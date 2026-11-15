import type { ReactNode } from 'react';

/** אייקונים קוויים לכפתורי הניווט והלוגיסטיקה. לכל כפתור אייקון יש גם תווית בריחוף */
const P: Record<string, ReactNode> = {
  model: <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 9L4 7.5M12 12l8-4.5M12 12v9" />,
  real: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  rights: <path d="M5 21V9l7-5 7 5v12M5 21h14M9 21v-6h6v6" strokeDasharray="3 2" />,
  design: <path d="M4 21V10l5-3v14M9 21V4l6 3v14M15 21v-9l5 2v7M3 21h18" />,
  top: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 12h16M12 4v16" />
    </>
  ),
  perspective: <path d="M3 18 8 6h8l5 12H3ZM8 6l2 12M16 6l-2 12M5.5 12h13" />,
  street: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v7M8 10h8M12 14l-3 7M12 14l3 7" />
    </>
  ),
  map: <path d="M3 6 9 4l6 2 6-2v14l-6 2-6-2-6 2V6ZM9 4v14M15 6v14" />,
  satellite: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  none: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 20 20 4" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-5-5M8 11h6M11 8v6" />
    </>
  ),
  box: (
    <>
      <path d="M3 3h13v10H3z" strokeDasharray="3 2" />
      <circle cx="16" cy="16" r="3.5" />
      <path d="m21 21-2.5-2.5" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-5-5M8 11h6" />
    </>
  ),
  print: <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" />
      <path d="M16 8V3H4v13h4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5 5 19" />,
  show: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  home: <path d="M3 11 12 3l9 8M5 10v11h14V10M10 21v-6h4v6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  prev: <path d="m9 5 7 7-7 7" />,
  next: <path d="m15 5-7 7 7 7" />,
};

export type IconName = keyof typeof P;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden>
      {P[name]}
    </svg>
  );
}

/** כפתור אייקון מרובע. התווית מוצגת בריחוף ונקראת על ידי קורא מסך */
export function IconBtn({
  icon,
  label,
  on,
  onClick,
  disabled,
  className = '',
}: {
  icon: IconName;
  label: string;
  on?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`btn h-8 w-8 shrink-0 p-0 ${on ? 'btn-on' : ''} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}
