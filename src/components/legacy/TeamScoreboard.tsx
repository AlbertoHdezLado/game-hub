import { TEAM_NAMES } from '@/lib/teamSetup';

interface TeamScoreboardProps {
  scores: number[];
  highlightWinner?: boolean;
  showRank?: boolean;
}

// mirrors legacy renderScoreboardRows(): ties share the same rank pill when showRank is set
export function TeamScoreboard({ scores, highlightWinner = false, showRank = false }: Readonly<TeamScoreboardProps>) {
  const scoresDesc = [...scores].sort((a, b) => b - a);
  const maxScore = scoresDesc[0];
  return (
    <div>
      {scores.map((score, t) => {
        const isTop = highlightWinner && score === maxScore;
        const pillLabel = showRank ? `${scoresDesc.indexOf(score) + 1}º` : t + 1;
        return (
          <div className={`team-score-row${isTop ? ' winner' : ''}`} key={t}>
            <span className="team-score-name"><span className={`mini-score-pill team-color-${t}`}>{pillLabel}</span>{TEAM_NAMES[t]}</span>
            <span className="team-score-value">{score}</span>
          </div>
        );
      })}
    </div>
  );
}
