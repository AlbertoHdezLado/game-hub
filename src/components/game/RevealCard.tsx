interface RevealCardProps {
  playerName: string;
  visible: boolean;
  title: string;
  content: string;
  onReveal: () => void;
  onClose: () => void;
}

export function RevealCard({ playerName, visible, title, content, onReveal, onClose }: Readonly<RevealCardProps>) {
  return (
    <dialog className="reveal-dialog" open>
      <span className="eyebrow">{playerName}</span>
      <div className={`reveal-wrap ${visible ? 'revealed' : ''}`}>
        <div className="reveal-content">
          <strong>{visible ? title : 'Tu tarjeta está oculta'}</strong>
          {visible && <span className="role-word">{content}</span>}
        </div>
        <button className="reveal-btn" type="button" onClick={visible ? onClose : onReveal}>{visible ? 'Ocultar y pasar' : 'Revelar'}</button>
      </div>
    </dialog>
  );
}