interface TeamTurnBadgeProps {
  team: number;
  score: number;
}

export function TeamTurnBadge({ team, score }: Readonly<TeamTurnBadgeProps>) {
  return <div className={`team-turn-badge team-color-${team % 4}`}>Equipo {team + 1}<span className="mini-score-pill">{score}</span></div>;
}