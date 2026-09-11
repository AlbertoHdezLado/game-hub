export interface ChipItem {
  id: string;
  label: string;
  icon?: string;
}

interface ChipListProps {
  items: readonly ChipItem[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
}

export function ChipList({ items, selectedIds, onToggle }: Readonly<ChipListProps>) {
  return (
    <div className="chip-list">
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <button className={`chip ${selected ? 'selected' : ''}`} type="button" key={item.id} aria-pressed={selected} onClick={() => onToggle(item.id)}>
            {item.icon && <span className="chip-icon" aria-hidden="true">{item.icon}</span>}
            <span className="chip-name">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}