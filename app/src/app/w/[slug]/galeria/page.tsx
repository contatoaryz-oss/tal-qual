import Link from 'next/link';
import type { Metadata } from 'next';
import { Images, Sparkles } from 'lucide-react';
import { toggleFavoriteAction } from '@/app/actions';
import { currentVersion, getWorkspace, listCreatives, listIcps, listOffers } from '@/lib/data';
import { fileUrl } from '@/lib/files';
import { PLACEMENTS } from '@/lib/data/types';
import { PageHeader } from '@/components/page';
import { Badge, EmptyState } from '@/components/ui/display';
import { buttonStyles } from '@/components/ui/button-styles';
import { CreativeThumb, STATUS_LABEL } from '@/components/creative-thumb';
import { FavoriteButton } from '@/components/favorite-button';
import { AutoRefresh } from '@/components/live/auto-refresh';
import { cn, focusRing } from '@/components/ui/cn';

export const metadata: Metadata = { title: 'Galeria' };

const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'favoritas', label: 'Favoritas' },
  { key: 'falhou', label: 'Com erro' },
] as const;

export default async function GalleryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ filtro?: string }> }) {
  const { slug } = await params;
  const { filtro = 'todas' } = await searchParams;
  const ws = getWorkspace(slug);
  const all = listCreatives(ws.id);
  const items = filtro === 'favoritas' ? all.filter((c) => c.favorite) : filtro === 'falhou' ? all.filter((c) => c.status === 'failed') : all;
  const offers = new Map(listOffers(ws.id).map((o) => [o.id, o.title]));
  const icps = new Map(listIcps(ws.id).map((i) => [i.id, i.name]));
  const pending = all.some((c) => c.status === 'queued' || c.status === 'processing');

  return (
    <>
      <AutoRefresh active={pending} intervalMs={1500} />
      <PageHeader
        title="Galeria"
        description="Tudo o que foi gerado para este cliente."
        actions={<Link href={`/w/${slug}/criar`} className={buttonStyles({ variant: 'accent' })}><Sparkles className="size-4" aria-hidden /> Criar</Link>}
      />
      {all.length === 0 ? (
        <EmptyState
          icon={<Images className="size-7" />}
          title="Nada gerado ainda"
          body="Escolha uma oferta e uma persona em Criar. As artes aparecem aqui assim que ficam prontas."
          action={<Link href={`/w/${slug}/criar`} className={buttonStyles({ variant: 'accent' })}>Criar a primeira arte</Link>}
        />
      ) : (
        <>
          <nav aria-label="Filtrar criativos" className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const n = f.key === 'favoritas' ? all.filter((c) => c.favorite).length : f.key === 'falhou' ? all.filter((c) => c.status === 'failed').length : all.length;
              const active = filtro === f.key;
              return (
                <Link
                  key={f.key}
                  href={f.key === 'todas' ? `/w/${slug}/galeria` : `/w/${slug}/galeria?filtro=${f.key}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium', active ? 'border-primary bg-primary text-on-primary' : 'border-border-input text-text hover:bg-surface-2', focusRing)}
                >
                  {f.label} <span className="tabular-nums opacity-80">{n}</span>
                </Link>
              );
            })}
          </nav>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-input p-8 text-center text-sm text-text-muted">Nenhuma arte neste filtro.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((c) => {
                const v = currentVersion(ws.id, c);
                const src = fileUrl(v?.mediaPaths[0]);
                const meta = [c.offerId && offers.get(c.offerId), c.icpId && icps.get(c.icpId)].filter(Boolean).join(' · ');
                return (
                  <li key={c.id} className="flex flex-col gap-2">
                    <Link href={`/w/${slug}/galeria/${c.id}`} className={`block rounded-md ${focusRing}`}>
                      <CreativeThumb creative={c} src={src} alt={`${c.headline ?? 'Arte'} — ${PLACEMENTS[c.placement].label}`} />
                    </Link>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 break-words text-sm font-medium text-text">{c.headline ?? STATUS_LABEL[c.status]}</p>
                        {meta && <p className="truncate text-xs text-text-muted">{meta}</p>}
                      </div>
                      {c.status === 'succeeded' ? (
                        <FavoriteButton favorite={c.favorite} onToggle={toggleFavoriteAction.bind(null, slug, c.id)} />
                      ) : (
                        <Badge size="sm" tone={c.status === 'failed' ? 'danger' : 'neutral'}>{STATUS_LABEL[c.status]}</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
