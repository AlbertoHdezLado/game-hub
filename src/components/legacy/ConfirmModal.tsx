import { useEscapeKey } from '@/hooks/useEscapeKey';

interface ConfirmModalProps {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// generic dismissible modal, mirrors legacy guide-modal-backdrop + shared.js confirm helpers
export function ConfirmModal({ title, text, confirmLabel, cancelLabel = 'Seguir jugando', onConfirm, onCancel }: Readonly<ConfirmModalProps>) {
  useEscapeKey(true, onCancel);
  return (
    <div className="guide-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="guide-modal">
        <h2>{title}</h2>
        <p>{text}</p>
        <button type="button" className="btn-main" style={{ marginTop: 14 }} onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className="night-nav-btn" style={{ width: '100%', marginTop: 10 }} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  );
}
