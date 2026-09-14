import type { ReactNode } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

// "Cómo se juega" modal, reused by every game (setupModal() in legacy shared.js)
export function GuideModal({ open, onClose, children }: Readonly<GuideModalProps>) {
  useEscapeKey(open, onClose);
  if (!open) return null;
  return (
    <div className="guide-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="guide-modal">
        <button type="button" className="guide-modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
