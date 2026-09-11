interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export function Stepper({ value, min, max, step = 1, onChange, format = String }: Readonly<StepperProps>) {
  return (
    <fieldset className="stepper" aria-label="Cantidad">
      <button type="button" aria-label="Reducir" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="value" aria-live="polite">{format(value)}</span>
      <button type="button" aria-label="Aumentar" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </fieldset>
  );
}