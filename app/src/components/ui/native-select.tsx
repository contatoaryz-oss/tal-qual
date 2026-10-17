import { useId, type SelectHTMLAttributes } from 'react';
import { cn, focusRing } from './cn';

/** Select nativo com o visual do sistema. Para formulários (envia valor sem JS); o Radix Select fica para menus ricos. */
export function NativeSelect({
  label, hint, error, options, className, id, ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string; options: { value: string; label: string }[] }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-sm font-medium text-text">{label}</label>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fid}-desc` : undefined}
        className={cn('h-10 w-full rounded-md border border-border-input bg-surface px-3 text-sm text-text aria-[invalid=true]:border-danger', focusRing, className)}
        {...props}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {(error || hint) && <p id={`${fid}-desc`} className={cn('text-sm', error ? 'text-danger' : 'text-text-muted')}>{error ?? hint}</p>}
    </div>
  );
}
