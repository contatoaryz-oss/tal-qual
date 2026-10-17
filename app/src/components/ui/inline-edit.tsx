'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { Button } from './button';
import { Tooltip } from './overlay';
import { cn, focusRing } from './cn';

type Result = { ok?: boolean; error?: string } | null | void;

/**
 * Campo editável na própria página (spec: InlineEditField).
 * Leitura é um botão "Editar X"; Enter salva (Ctrl+Enter no multiline), Esc cancela, o foco volta ao botão.
 */
export function InlineEdit({
  label, value, placeholder, multiline, maxLength, edited, onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
  edited?: boolean;
  onSave: (v: string) => Promise<Result>;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const readBtn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const returnFocus = useRef(false);
  useEffect(() => {
    if (editing) input.current?.focus();
    else if (returnFocus.current) { returnFocus.current = false; readBtn.current?.focus(); }
  }, [editing]);
  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  // O foco volta ao botão de leitura depois que o modo de edição fecha (efeito acima), não num rAF:
  // dentro de uma transição o render pode vir depois do próximo frame.
  const close = () => { returnFocus.current = true; setEditing(false); setError(null); };
  const save = () =>
    start(async () => {
      const r = await onSave(draft);
      if (r && r.error) { setError(r.error); return; }
      setSaved(true);
      close();
    });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span id={`${id}-label`} className="text-sm font-medium text-text">{label}</span>
        {edited && (
          <Tooltip content="Você editou. Reler o site não sobrescreve.">
            <span className="size-2 rounded-full bg-accent" role="img" aria-label="editado por você" tabIndex={0} />
          </Tooltip>
        )}
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-success" role="status">
            <Check className="size-3.5" aria-hidden /> salvo
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          {multiline ? (
            <textarea
              ref={input}
              aria-labelledby={`${id}-label`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : `${id}-help`}
              rows={3}
              maxLength={maxLength}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close();
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
              }}
              className={cn('w-full rounded-md border border-border-input bg-surface px-3 py-2 text-sm text-text', focusRing)}
            />
          ) : (
            <input
              ref={input}
              aria-labelledby={`${id}-label`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : `${id}-help`}
              maxLength={maxLength}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close();
                if (e.key === 'Enter') { e.preventDefault(); save(); }
              }}
              className={cn('h-10 w-full rounded-md border border-border-input bg-surface px-3 text-sm text-text', focusRing)}
            />
          )}
          {error ? (
            <p id={`${id}-err`} className="text-sm text-danger">{error}</p>
          ) : (
            <p id={`${id}-help`} className="text-xs text-text-muted">{multiline ? 'Ctrl+Enter salva, Esc cancela.' : 'Enter salva, Esc cancela.'}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} loading={pending}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={close} disabled={pending}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <button
          ref={readBtn}
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${label.toLowerCase()}${value ? `: ${value}` : ''}`}
          className={cn(
            'group flex min-h-10 w-full items-start justify-between gap-3 rounded-md border border-dashed border-transparent px-3 py-2 text-left',
            'hover:border-border-input hover:bg-surface-2',
            focusRing,
          )}
        >
          <span className={cn('break-words text-sm', value ? 'text-text' : 'text-text-muted')}>{value || placeholder}</span>
          {pending ? (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-text-muted" aria-hidden />
          ) : (
            <Pencil className="mt-0.5 size-4 shrink-0 text-text-muted opacity-60 group-hover:opacity-100" aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}
