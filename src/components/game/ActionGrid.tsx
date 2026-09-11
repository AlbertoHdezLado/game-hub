import type { ReactNode } from 'react';

interface ActionGridProps {
  children: ReactNode;
}

export function ActionGrid({ children }: Readonly<ActionGridProps>) {
  return <div className="action-grid">{children}</div>;
}