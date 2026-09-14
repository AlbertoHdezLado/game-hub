import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { TEAM_NAMES, type TeamRow } from '@/lib/teamSetup';

interface TeamBoxesProps {
  rows: TeamRow[];
  numTeams: number;
  onAssign: (rowIndex: number, team: number) => void;
}

interface DragState {
  rowIndex: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  width: number;
  hoverTeam: number | null;
}

// tap-drag a player's chip into another team's box, mirrors legacy pointerdown/move/up handlers
export function TeamBoxes({ rows, numTeams, onAssign }: Readonly<TeamBoxesProps>) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const boxesRef = useRef<HTMLDivElement>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, rowIndex: number) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDrag({ rowIndex, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, x: rect.left, y: rect.top, width: rect.width, hoverTeam: null });

    function onMove(e: PointerEvent) {
      e.preventDefault();
      const boxEl = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-team-box]');
      const hoverTeam = boxEl ? Number(boxEl.dataset.teamBox) : null;
      setDrag((current) => current && { ...current, x: e.clientX - current.offsetX, y: e.clientY - current.offsetY, hoverTeam });
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDrag((current) => {
        if (current && current.hoverTeam !== null) onAssign(current.rowIndex, current.hoverTeam);
        return null;
      });
    }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  return (
    <div id="team-boxes" ref={boxesRef}>
      {Array.from({ length: numTeams }, (_, team) => {
        const members = rows.map((r, idx) => ({ ...r, idx })).filter((r) => r.name.trim() && Math.min(r.team, numTeams - 1) === team);
        return (
          <div key={team} className={`team-box team-color-${team}${drag?.hoverTeam === team ? ' drag-over' : ''}`} data-team-box={team}>
            <div className="team-box-header"><span className={`team-box-dot team-color-${team}`} />{TEAM_NAMES[team]}</div>
            <div className="team-box-chips">
              {members.length ? members.map((m) => (
                <button
                  key={m.idx}
                  type="button"
                  className={`team-box-chip team-color-${team}${drag?.rowIndex === m.idx ? ' dragging' : ''}`}
                  style={drag?.rowIndex === m.idx ? { position: 'fixed', left: drag.x, top: drag.y, width: drag.width } : undefined}
                  onPointerDown={(event) => handlePointerDown(event, m.idx)}
                >
                  {m.name}
                </button>
              )) : <span className="team-box-empty">Sin jugadores</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
