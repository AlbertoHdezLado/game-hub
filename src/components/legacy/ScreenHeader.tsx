import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '@/components/legacy/ConfirmModal';

interface ScreenHeaderProps {
  /** setup screens navigate home/help with no confirmation and have no back-to-setup button */
  variant?: 'setup' | 'game';
  onBackToSetup?: () => void;
  onHelp: () => void;
}

// mirrors legacy .setup-header: home link + optional back-to-setup + ayuda trigger
export function ScreenHeader({ variant = 'setup', onBackToSetup, onHelp }: Readonly<ScreenHeaderProps>) {
  const navigate = useNavigate();
  const [confirmHome, setConfirmHome] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);

  function handleHomeClick(event: MouseEvent) {
    if (variant === 'setup') return;
    event.preventDefault();
    setConfirmHome(true);
  }

  const homeLink = (
    <a href="/" className="guide-btn" aria-label="Inicio" onClick={handleHomeClick}><span className="home-icon" /></a>
  );

  return (
    <>
      <div className="setup-header">
        {variant === 'game' && onBackToSetup ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {homeLink}
            <button type="button" className="guide-btn back-to-setup-btn" aria-label="Volver a configuración" onClick={() => setConfirmBack(true)}><span className="back-icon" /></button>
          </div>
        ) : homeLink}
        <button type="button" className="guide-btn ayuda-trigger" aria-label="Ayuda" onClick={onHelp}>?</button>
      </div>
      {confirmHome && (
        <ConfirmModal title="¿Salir al inicio?" text="Se perderá el progreso de la partida actual." confirmLabel="Salir al inicio" onConfirm={() => navigate('/')} onCancel={() => setConfirmHome(false)} />
      )}
      {confirmBack && onBackToSetup && (
        <ConfirmModal title="¿Volver a configuración?" text="Se perderá el progreso de la partida actual." confirmLabel="Volver a configuración" onConfirm={() => { setConfirmBack(false); onBackToSetup(); }} onCancel={() => setConfirmBack(false)} />
      )}
    </>
  );
}
