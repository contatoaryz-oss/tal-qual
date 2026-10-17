import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Creative } from '@/lib/data/types';
import { cn } from '@/components/ui/cn';

/** Miniatura de criativo com a proporção real e os estados da spec (fila, gerando, pronto, falhou). */
export function CreativeThumb({ creative, src, alt, className }: { creative: Creative; src: string | null; alt: string; className?: string }) {
  const ratio = creative.aspectRatio.replace(':', ' / ');
  const pending = creative.status === 'queued' || creative.status === 'processing';
  return (
    <div className={cn('relative w-full overflow-hidden rounded-md bg-surface-2', className)} style={{ aspectRatio: ratio }}>
      {src && creative.status === 'succeeded' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" loading="lazy" />
      ) : pending ? (
        <div className="absolute inset-0 flex animate-pulse flex-col items-center justify-center gap-2 text-text-muted motion-reduce:animate-none">
          <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
          <span className="text-sm font-medium">{creative.status === 'queued' ? 'Na fila' : 'Gerando'}</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-danger">
          <AlertTriangle className="size-6" aria-hidden />
          <span className="text-sm font-medium">Não deu certo</span>
        </div>
      )}
    </div>
  );
}

export const STATUS_LABEL: Record<Creative['status'], string> = {
  draft: 'rascunho', queued: 'na fila', processing: 'gerando', succeeded: 'pronta', failed: 'falhou',
};
