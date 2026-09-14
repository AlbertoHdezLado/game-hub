interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: Readonly<ProgressDotsProps>) {
  return (
    <div className="progress-dots">
      {Array.from({ length: total }, (_, index) => (
        <div key={index} className={`dot${index < current ? ' done' : index === current ? ' current' : ''}`} />
      ))}
    </div>
  );
}
