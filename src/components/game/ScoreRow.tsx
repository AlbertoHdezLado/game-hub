import type { ReactNode } from 'react';

interface ScoreRowProps {
  children: ReactNode;
  trailing: ReactNode;
}

export function ScoreRow({ children, trailing }: Readonly<ScoreRowProps>) {
  return <div className="score-row"><span>{children}</span><span>{trailing}</span></div>;
}