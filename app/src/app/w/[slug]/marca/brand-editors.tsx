'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { ImageUp, Plus, Trash2, Upload } from 'lucide-react';
import type { FormState } from '@/app/actions';
import type { BrandColor, ColorRole } from '@/lib/data/types';
import { Button, IconButton } from '@/components/ui/button';
import { cn, focusRing } from '@/components/ui/cn';

const ROLE_LABEL: Record<ColorRole, string> = {
  primary: 'Principal', secondary: 'Secundária', accent: 'Destaque', bg: 'Fundo', text: 'Texto',
};
const ROLES = Object.keys(ROLE_LABEL) as ColorRole[];
const HEX = /^#[0-9A-Fa-f]{6}$/;

/* ------------------------------ cores ------------------------------ */

export function ColorEditor({ initial, onSave }: { initial: BrandColor[]; onSave: (c: BrandColor[]) => Promise<FormState> }) {
  const [colors, setColors] = useState<BrandColor[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(colors) !== JSON.stringify(initial);
  const invalid = colors.findIndex((c) => !HEX.test(c.hex));

  useEffect(() => setColors(initial), [initial]);

  const set = (i: number, patch: Partial<BrandColor>) => {
    setSaved(false);
    setColors((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  };

  return (
    <div className="flex flex-col gap-4">
      {colors.length === 0 && (
        <p className="text-sm text-text-muted">Nenhuma cor ainda. Adicione pelo menos a principal e a de destaque.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {colors.map((c, i) => {
          const valid = HEX.test(c.hex);
          return (
            <li key={i} className="flex items-center gap-3 rounded-md border border-border p-2">
              <label className={cn('relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-input', 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-bg')}>
                <span className="absolute inset-0" style={{ background: valid ? c.hex : 'transparent' }} aria-hidden />
                <input
                  type="color"
                  value={valid ? c.hex : '#000000'}
                  onChange={(e) => set(i, { hex: e.target.value.toUpperCase() })}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={`Escolher cor ${i + 1}`}
                />
              </label>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  value={c.hex}
                  onChange={(e) => set(i, { hex: e.target.value.trim() })}
                  aria-label={`Código da cor ${i + 1}`}
                  aria-invalid={!valid || undefined}
                  maxLength={7}
                  className={cn('h-8 w-full rounded-sm border border-border-input bg-surface px-2 font-mono text-sm uppercase text-text aria-[invalid=true]:border-danger', focusRing)}
                />
                <select
                  value={c.role}
                  onChange={(e) => set(i, { role: e.target.value as ColorRole })}
                  aria-label={`Papel da cor ${i + 1}`}
                  className={cn('h-8 w-full rounded-sm border border-border-input bg-surface px-2 text-sm text-text', focusRing)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <IconButton label={`Remover cor ${i + 1}`} size="sm" onClick={() => setColors((cs) => cs.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </li>
          );
        })}
      </ul>
      {invalid >= 0 && <p className="text-sm text-danger" role="alert">A cor {invalid + 1} precisa estar no formato #RRGGBB.</p>}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="size-4" aria-hidden />}
          disabled={colors.length >= 8}
          onClick={() => setColors((cs) => [...cs, { hex: '#777777', role: cs.some((c) => c.role === 'accent') ? 'secondary' : 'accent' }])}
        >
          Adicionar cor
        </Button>
        <Button
          size="sm"
          disabled={!dirty || invalid >= 0}
          loading={pending}
          onClick={() => start(async () => {
            const r = await onSave(colors);
            if (r?.error) setError(r.error);
            else { setError(null); setSaved(true); }
          })}
        >
          Salvar cores
        </Button>
        {saved && !dirty && <span role="status" className="text-sm text-success">Cores salvas</span>}
      </div>
    </div>
  );
}

/* ------------------------------ logo ------------------------------ */

export function LogoUpload({
  logoUrl, action, onRemove,
}: { logoUrl: string | null; action: (s: FormState, fd: FormData) => Promise<FormState>; onRemove: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const [dragging, setDragging] = useState(false);
  const [removing, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-28 w-full items-center justify-center rounded-md border border-border bg-surface-2 p-3 sm:w-48">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo atual do cliente" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-sm text-text-muted"><ImageUp className="size-6" aria-hidden />Sem logo</span>
        )}
      </div>
      <form ref={form} action={formAction} className="flex flex-1 flex-col gap-2">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f && fileInput.current) {
              const dt = new DataTransfer();
              dt.items.add(f);
              fileInput.current.files = dt.files;
              form.current?.requestSubmit();
            }
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-4 py-5 text-center',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-bg',
            dragging ? 'border-ring bg-accent-subtle' : 'border-border-input',
          )}
        >
          <Upload className="size-5 text-text-muted" aria-hidden />
          <span className="text-sm font-medium text-text">{pending ? 'Enviando…' : 'Arraste o logo oficial ou clique para escolher'}</span>
          <span className="text-xs text-text-muted">PNG, JPG, WebP ou SVG, até 10 MB. Esse arquivo entra exatamente assim nas artes.</span>
          <input
            ref={fileInput}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            aria-describedby="logo-msg"
            onChange={() => form.current?.requestSubmit()}
          />
        </label>
        <p id="logo-msg" aria-live="polite" className={cn('text-sm', state?.fieldErrors?.logo ? 'text-danger' : 'text-success')}>
          {state?.fieldErrors?.logo ?? (state?.ok ? 'Logo atualizado.' : '')}
        </p>
        {logoUrl && (
          <div>
            <Button variant="ghost" size="sm" loading={removing} icon={<Trash2 className="size-4" aria-hidden />} onClick={() => start(() => onRemove())}>
              Remover logo
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
