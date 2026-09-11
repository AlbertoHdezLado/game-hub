interface RolePickerRole {
  id: string;
  nombre: string;
  imagen: string;
}

interface RolePickerGridProps {
  roles: readonly RolePickerRole[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
}

export function RolePickerGrid({ roles, selectedIds, onToggle }: Readonly<RolePickerGridProps>) {
  return (
    <div className="role-picker-grid" aria-label="Roles especiales">
      {roles.map((role) => {
        const selected = selectedIds.includes(role.id);
        return <button className={`role-picker-card ${selected ? 'selected' : ''}`} type="button" key={role.id} aria-pressed={selected} onClick={() => onToggle(role.id)}>
          <img src={`/${role.imagen}`} alt="" />
          <span className="role-picker-name">{role.nombre}</span>
        </button>;
      })}
    </div>
  );
}