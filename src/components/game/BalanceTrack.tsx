interface BalanceTrackProps {
  wolves: number;
  villagers: number;
}

export function BalanceTrack({ wolves, villagers }: Readonly<BalanceTrackProps>) {
  const total = Math.max(1, wolves + villagers);
  return <div className="narrator-balance-track" aria-label={`${wolves} lobos y ${villagers} aldeanos`}><span className="narrator-balance-fill-lobos" style={{ flexBasis: `${(wolves / total) * 100}%` }} /><span className="narrator-balance-fill-aldeanos" style={{ flexBasis: `${(villagers / total) * 100}%` }} /></div>;
}