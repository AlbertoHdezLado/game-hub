interface TimerProps {
  seconds: number;
  running: boolean;
}

export function Timer({ seconds, running }: TimerProps) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return <div className={`timer ${running ? 'is-running' : ''} ${seconds <= 5 ? 'is-danger' : ''}`} aria-live="polite">{minutes}:{remainder}</div>;
}
