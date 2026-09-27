export interface Segment<T extends string> {
  id: T;
  label: string;
  testId?: string;
}

/**
 * Switches what one area shows. Place it directly above the area it changes.
 * Each option is a pressed or unpressed button, so screen readers announce the state.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
  compact = false,
  className
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const classes = ['segmented', compact ? 'is-compact' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={classes} role="group" aria-label={label}>
      {segments.map((s) => (
        <button key={s.id} type="button" aria-pressed={s.id === value} onClick={() => onChange(s.id)} data-testid={s.testId}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
