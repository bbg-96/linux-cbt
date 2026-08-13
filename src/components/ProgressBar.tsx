interface Props {
  value: number;
  max: number;
}

export function ProgressBar({ value, max }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="pbar" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`pbar-fill ${pct === 100 ? "pbar-done" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
