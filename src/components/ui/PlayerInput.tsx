import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';

export interface PlayerInputProps {
  names: readonly string[];
  onChange?: (names: string[]) => void;
  onAdd?: (name: string) => void;
  onRemove?: (index: number) => void;
  min?: number;
  max?: number;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PlayerInput({
  names,
  onChange,
  onAdd,
  onRemove,
  min = 0,
  max = 20,
  label,
  placeholder = 'Nombre del jugador...',
  disabled = false,
}: Readonly<PlayerInputProps>) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed || names.length >= max || disabled) return;

    const next = [...names, trimmed];
    onChange?.(next);
    onAdd?.(trimmed);
    setDraft('');
    inputRef.current?.focus();
  }

  function handleRemove(indexToRemove: number) {
    if (names.length <= min || disabled) return;

    const next = names.filter((_, index) => index !== indexToRemove);
    onChange?.(next);
    onRemove?.(indexToRemove);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    handleAdd();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  }

  const isMax = names.length >= max;
  const canAdd = Boolean(draft.trim()) && !isMax && !disabled;

  return (
    <div className="player-input-container">
      {label && (
        <div className="player-input-header">
          <span className="player-input-label">{label}</span>
          <span className="player-count-badge" aria-label={`${names.length} jugadores`}>
            {names.length}
          </span>
        </div>
      )}

      {names.length > 0 && (
        <div className="player-cards-list" role="list" aria-label="Lista de jugadores">
          {names.map((name, index) => {
            const canRemove = names.length > min && !disabled;
            return (
              <div className="player-card" key={`${index}-${name}`} role="listitem">
                <span className="player-card-name" title={name}>
                  {name}
                </span>
                <button
                  type="button"
                  className="player-card-remove"
                  aria-label={`Eliminar ${name}`}
                  disabled={!canRemove}
                  onClick={() => handleRemove(index)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <form className="player-input-form" onSubmit={handleSubmit}>
        <div className="player-input-row">
          <input
            ref={inputRef}
            type="text"
            className="player-name-input"
            value={draft}
            placeholder={isMax ? `Máximo alcanzado (${max})` : placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isMax || disabled}
            maxLength={30}
          />
          <button
            type="button"
            className="btn-add-player"
            disabled={!canAdd}
            onClick={handleAdd}
          >
            Añadir
          </button>
        </div>
      </form>
    </div>
  );
}
