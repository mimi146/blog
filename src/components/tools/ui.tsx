import type { ComponentChildren } from 'preact';

export function valueOf(event: Event): string {
  return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}

export function checkedOf(event: Event): boolean {
  return (event.currentTarget as HTMLInputElement).checked;
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ComponentChildren }) {
  return (
    <div className="tool-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="tool-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="tool-error" role="alert">
      {message}
    </p>
  );
}

export function ToolForm({ labelledBy, children, onSubmit }: { labelledBy?: string; children: ComponentChildren; onSubmit?: () => void }) {
  return (
    <form
      className="tool-panel"
      autoComplete="off"
      aria-labelledby={labelledBy}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
    </form>
  );
}
