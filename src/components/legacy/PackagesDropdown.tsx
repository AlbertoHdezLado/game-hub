import { useState } from 'react';
import { ConfirmModal } from '@/components/legacy/ConfirmModal';
import { isAdultContent } from '@/lib/legacy';

export interface PackageItem {
  id: string;
  nombre: string;
  icono?: string;
}

interface PackagesDropdownProps {
  packages: PackageItem[] | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// collapsible category picker used by Mímica / Time's Up / Tabú (packages-dropdown-*)
export function PackagesDropdown({ packages, selectedIds, onChange }: Readonly<PackagesDropdownProps>) {
  const [open, setOpen] = useState(false);
  const [pendingAdultId, setPendingAdultId] = useState<string | null>(null);
  const [pendingSelectAll, setPendingSelectAll] = useState(false);

  const total = packages?.length ?? 0;
  const summary = !packages ? 'Cargando categorías…'
    : selectedIds.length === 0 ? 'Ninguna categoría seleccionada'
    : selectedIds.length === total ? `Todas las categorías (${total})`
    : `${selectedIds.length} de ${total} categorías`;

  function toggle(id: string) {
    if (selectedIds.includes(id)) { onChange(selectedIds.filter((x) => x !== id)); return; }
    const pkg = packages!.find((p) => p.id === id);
    if (isAdultContent(pkg)) { setPendingAdultId(id); return; }
    onChange([...selectedIds, id]);
  }

  function toggleAll() {
    if (!packages) return;
    if (selectedIds.length === packages.length) { onChange([]); return; }
    const hasUnselectedAdult = packages.some((p) => isAdultContent(p) && !selectedIds.includes(p.id));
    if (hasUnselectedAdult) { setPendingSelectAll(true); return; }
    onChange(packages.map((p) => p.id));
  }

  return (
    <>
      <button type="button" className="packages-dropdown-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="packages-dropdown-summary">{summary}</span>
        <span className="packages-dropdown-chevron">▾</span>
      </button>
      {open && (
        <div className="packages-dropdown-panel">
          <button type="button" className="chip-toggle-all" onClick={toggleAll}>{packages && selectedIds.length === packages.length ? 'Quitar todas' : 'Seleccionar todas'}</button>
          <div className="chip-list">
            {!packages || packages.length === 0 ? <p className="chip-loading">Cargando categorías…</p> : packages.map((p) => (
              <button key={p.id} type="button" className={`chip${selectedIds.includes(p.id) ? ' selected' : ''}`} onClick={() => toggle(p.id)}>
                <span className="chip-icon">{p.icono ?? '📦'}</span>
                <span className="chip-name">{p.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {(pendingAdultId !== null || pendingSelectAll) && packages && (
        <ConfirmModal
          title="🔞 Contenido para adultos"
          text="Esta categoría incluye contenido para mayores de 18 años. ¿Seguro que quieres activarla?"
          confirmLabel="Sí, activar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            if (pendingAdultId !== null) onChange([...selectedIds, pendingAdultId]);
            else onChange(packages.map((p) => p.id));
            setPendingAdultId(null);
            setPendingSelectAll(false);
          }}
          onCancel={() => { setPendingAdultId(null); setPendingSelectAll(false); }}
        />
      )}
    </>
  );
}
