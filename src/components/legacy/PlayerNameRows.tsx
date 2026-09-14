import { effectivePlayerCount, normalizeTrailingSlot } from '@/lib/legacy';

interface PlayerNameRowsProps {
  rows: string[];
  onChange: (rows: string[]) => void;
  min: number;
  max: number;
}

// mirrors legacy player-row list: trailing empty slot always grows, no "add" button
export function PlayerNameRows({ rows, onChange, min, max }: Readonly<PlayerNameRowsProps>) {
  function handleInput(index: number, value: string) {
    const next = rows.slice();
    next[index] = value;
    onChange(normalizeTrailingSlot(next, max));
  }

  function handleRemove(index: number) {
    if (effectivePlayerCount(rows) <= min) return;
    const next = rows.slice();
    next.splice(index, 1);
    onChange(normalizeTrailingSlot(next, max));
  }

  return (
    <>
      {rows.map((name, index) => {
        const isTrailingSlot = index === rows.length - 1 && !name.trim();
        return (
          <div className="player-row" key={index}>
            <input
              type="text"
              className="player-name-input"
              placeholder={`Jugador ${index + 1}`}
              maxLength={20}
              value={name}
              onChange={(event) => handleInput(index, event.target.value)}
            />
            {!isTrailingSlot && (
              <button type="button" className="row-remove-btn" disabled={effectivePlayerCount(rows) <= min} onClick={() => handleRemove(index)}>✕</button>
            )}
          </div>
        );
      })}
    </>
  );
}
