import { realPlayerCount, type TeamRow } from '@/lib/teamSetup';

interface TeamPlayerRowsProps {
  rows: TeamRow[];
  onChange: (rows: TeamRow[]) => void;
  min: number;
  max: number;
  numTeams: number;
  onNormalize: (rows: TeamRow[]) => TeamRow[];
}

// name-entry step for team games (Mímica/Time's Up/Tabú): same trailing-slot list as PlayerNameRows,
// but each row also carries a `team` field assigned separately in the team-boxes step
export function TeamPlayerRows({ rows, onChange, min, max, onNormalize }: Readonly<TeamPlayerRowsProps>) {
  function handleInput(index: number, value: string) {
    const next = rows.slice();
    next[index] = { ...next[index], name: value };
    onChange(onNormalize(next));
  }

  function handleRemove(index: number) {
    if (realPlayerCount(rows) <= min) return;
    const next = rows.slice();
    next.splice(index, 1);
    onChange(onNormalize(next));
  }

  return (
    <>
      {rows.map((row, index) => {
        const isTrailingSlot = index === rows.length - 1 && !row.name.trim();
        return (
          <div className="player-row" key={index}>
            <input
              type="text"
              className="player-name-input"
              placeholder={`Jugador ${index + 1}`}
              maxLength={20}
              value={row.name}
              onChange={(event) => handleInput(index, event.target.value)}
            />
            {!isTrailingSlot && (
              <button type="button" className="row-remove-btn" disabled={realPlayerCount(rows) <= min} onClick={() => handleRemove(index)}>✕</button>
            )}
          </div>
        );
      })}
    </>
  );
}
