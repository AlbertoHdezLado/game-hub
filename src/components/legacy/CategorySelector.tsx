import { useState } from 'react';
import { ConfirmModal } from '@/components/legacy/ConfirmModal';
import { isAdultContent } from '@/lib/legacy';

export interface SelectableCategory {
  id: string;
  nombre: string;
  icono?: string;
}

interface CategorySelectorProps {
  categories: SelectableCategory[] | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// mirrors legacy renderCategoryList()/chip-toggle-all/confirmAdultContent()
export function CategorySelector({ categories, selectedIds, onChange }: Readonly<CategorySelectorProps>) {
  const [pendingAdultId, setPendingAdultId] = useState<string | null>(null);
  const [pendingSelectAll, setPendingSelectAll] = useState(false);

  if (!categories || categories.length === 0) {
    return (
      <>
        <button type="button" className="chip-toggle-all" disabled>Seleccionar todas</button>
        <div className="chip-list"><p className="chip-loading">Cargando categorías…</p></div>
      </>
    );
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) { onChange(selectedIds.filter((x) => x !== id)); return; }
    const category = categories!.find((c) => c.id === id);
    if (isAdultContent(category)) { setPendingAdultId(id); return; }
    onChange([...selectedIds, id]);
  }

  function toggleAll() {
    if (selectedIds.length === categories!.length) { onChange([]); return; }
    const hasUnselectedAdult = categories!.some((c) => isAdultContent(c) && !selectedIds.includes(c.id));
    if (hasUnselectedAdult) { setPendingSelectAll(true); return; }
    onChange(categories!.map((c) => c.id));
  }

  return (
    <>
      <button type="button" className="chip-toggle-all" onClick={toggleAll}>
        {selectedIds.length === categories.length ? 'Quitar todas' : 'Seleccionar todas'}
      </button>
      <div className="chip-list">
        {categories.map((category) => (
          <button key={category.id} type="button" className={`chip${selectedIds.includes(category.id) ? ' selected' : ''}`} onClick={() => toggle(category.id)}>
            <span className="chip-icon">{category.icono ?? '📦'}</span>
            <span className="chip-name">{category.nombre}</span>
          </button>
        ))}
      </div>
      {(pendingAdultId !== null || pendingSelectAll) && (
        <ConfirmModal
          title="🔞 Contenido para adultos"
          text="Esta categoría incluye contenido para mayores de 18 años. ¿Seguro que quieres activarla?"
          confirmLabel="Sí, activar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            if (pendingAdultId !== null) onChange([...selectedIds, pendingAdultId]);
            else onChange(categories!.map((c) => c.id));
            setPendingAdultId(null);
            setPendingSelectAll(false);
          }}
          onCancel={() => { setPendingAdultId(null); setPendingSelectAll(false); }}
        />
      )}
    </>
  );
}
