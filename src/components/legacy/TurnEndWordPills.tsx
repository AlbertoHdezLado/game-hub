export interface TurnResult {
  word: string;
  correct: boolean;
}

interface TurnEndWordPillsProps {
  results: TurnResult[];
  teamIdx: number;
  pillClassName: string;
  onToggle: (index: number) => void;
}

// editable tally of words from the just-finished turn (tap a pill to flip acierto/fallo), mirrors legacy
export function TurnEndWordPills({ results, teamIdx, pillClassName, onToggle }: Readonly<TurnEndWordPillsProps>) {
  return (
    <div className={pillClassName}>
      {results.map((result, index) => (
        <button
          key={index}
          type="button"
          className={`${pillClassName.replace('-wrap', '')} team-color-${teamIdx}${result.correct ? '' : ' turn-missed'}`}
          aria-label={`Marcar ${result.word} como ${result.correct ? 'no acertada' : 'acertada'}`}
          onClick={() => onToggle(index)}
        >
          {result.word}
        </button>
      ))}
    </div>
  );
}
