export default function ColorSwatch({ color, size = 'md' }: { color: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-block shrink-0 shadow-[inset_0_0_0_1px_rgba(46,46,43,0.15)] ${size === 'sm' ? 'h-3 w-3' : 'h-6 w-6'}`}
      style={{ backgroundColor: color }}
    />
  );
}
