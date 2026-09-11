export type SecretRole = 'red' | 'blue' | 'green' | 'neutral' | 'assassin';

interface SecretBoardProps {
  words: readonly string[];
  roles: readonly SecretRole[];
  keyVisible: boolean;
  onCellSelect: (index: number) => void;
}

export function SecretBoard({ words, roles, keyVisible, onCellSelect }: Readonly<SecretBoardProps>) {
  return (
    <div className={`secret-board ${keyVisible ? 'key-visible' : ''}`}>
      {words.map((word, index) => (
        <button className={`secret-cell role-${roles[index]}`} type="button" key={`${word}-${index}`} onClick={() => onCellSelect(index)}>{word}</button>
      ))}
    </div>
  );
}