'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn, focusRing } from './cn';

const control = cn(
  'w-full rounded-md border border-border-input bg-surface text-text placeholder:text-text-muted',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)]',
  'focus-visible:border-ring disabled:bg-surface-2 disabled:cursor-not-allowed',
  'aria-[invalid=true]:border-danger',
  focusRing,
);

type FieldShellProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-desc`} className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-desc`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  validating?: boolean;
  fieldSize?: 'md' | 'lg';
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, validating, fieldSize = 'md', id, className, ...props }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <FieldShell id={fid} label={label} hint={hint} error={error}>
        <div className="relative">
          <input
            ref={ref}
            id={fid}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? `${fid}-desc` : undefined}
            className={cn(control, fieldSize === 'lg' ? 'h-12 px-4 text-md' : 'h-10 px-3 text-sm', validating && 'pr-10', className)}
            {...props}
          />
          {validating && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-muted" aria-label="Validando" />
          )}
        </div>
      </FieldShell>
    );
  },
);
TextField.displayName = 'TextField';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className, rows = 3, ...props }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <FieldShell id={fid} label={label} hint={hint} error={error}>
        <textarea
          ref={ref}
          id={fid}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fid}-desc` : undefined}
          className={cn(control, 'px-3 py-2 text-sm', className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
Textarea.displayName = 'Textarea';
