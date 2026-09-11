interface PackOption {
  id: string;
  label: string;
  icon?: string;
}

interface PackSelectorProps {
  packs: readonly PackOption[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

export function PackSelector({ packs, selectedIds, onToggle, onToggleAll }: Readonly<PackSelectorProps>) {
  const allSelected = packs.length > 0 && selectedIds.length === packs.length;
  return (
    <div className="pack-selector">
      <div className="selector-heading"><span>Paquetes</span><button type="button" onClick={onToggleAll}>{allSelected ? 'Quitar todos' : 'Seleccionar todos'}</button></div>
      {packs.map((pack) => <label className="pack-option" key={pack.id}><input type="checkbox" checked={selectedIds.includes(pack.id)} onChange={() => onToggle(pack.id)} /><span>{pack.icon} {pack.label}</span></label>)}
    </div>
  );
}