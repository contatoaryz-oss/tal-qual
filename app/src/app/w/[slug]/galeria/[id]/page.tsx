import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Download, RotateCcw, Sparkles } from 'lucide-react';
import { createVariationAction, deleteCreativeAction, retryCreativeAction, toggleFavoriteAction } from '@/app/actions';
import { NotFoundError, getBrandKit, getCreative, getIcp, getOffer, getWorkspace, listVersions } from '@/lib/data';
import { PLACEMENTS } from '@/lib/data/types';
import { fileUrl } from '@/lib/files';
import { PageHeader, Section } from '@/components/page';
import { Badge, InlineAlert } from '@/components/ui/display';
import { Button } from '@/components/ui/button';
import { buttonStyles } from '@/components/ui/button-styles';
import { Tabs } from '@/components/ui/controls';
import { CreativeThumb, STATUS_LABEL } from '@/components/creative-thumb';
import { FavoriteButton } from '@/components/favorite-button';
import { CopyButton } from '@/components/copy-button';
import { ConfirmDelete } from '@/components/confirm-delete';
import { AutoRefresh } from '@/components/live/auto-refresh';

export const metadata: Metadata = { title: 'Criativo' };

const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
const dt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default async function CreativePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ws = await getWorkspace(slug);
  let c;
  try { c = await getCreative(ws.id, id); } catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
  const versions = await listVersions(ws.id, id);
  const current = versions.find((v) => v.version === c.currentVersion);
  const src = fileUrl(current?.mediaPaths[0]);
  const offer = c.offerId ? await safe(getOffer(ws.id, c.offerId)) : null;
  const icp = c.icpId ? await safe(getIcp(ws.id, c.icpId)) : null;
  const brand = await getBrandKit(ws.id);
  const logo = fileUrl(brand.logoPath);
  const pending = c.status === 'queued' || c.status === 'processing';
  const initials = (brand.companyName ?? ws.name).split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const preview = (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-xs font-bold text-text">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" className="size-full object-contain p-1" /> : initials}
        </span>
        <span className="truncate text-sm font-semibold text-text">{brand.companyName ?? ws.name}</span>
        <span className="ml-auto text-xs text-text-muted">Patrocinado</span>
      </div>
      <CreativeThumb creative={c} src={src} alt={`Arte: ${c.headline ?? ''}`} className="rounded-none" />
      {current?.body && <p className="whitespace-pre-line break-words px-3 py-3 text-sm text-text">{current.body}</p>}
    </div>
  );

  const texts = current ? (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-text">Título da arte</h3><CopyButton text={current.headline ?? ''} /></div>
        <p className="break-words rounded-md bg-surface-2 p-3 text-sm text-text">{current.headline}</p>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-text">Legenda</h3><CopyButton text={current.body ?? ''} /></div>
        <p className="whitespace-pre-line break-words rounded-md bg-surface-2 p-3 text-sm text-text">{current.body}</p>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-text">Chamada</h3>
        <p className="rounded-md bg-surface-2 p-3 text-sm text-text">{current.cta}</p>
      </div>
    </div>
  ) : <p className="text-sm text-text-muted">O texto aparece quando a arte ficar pronta.</p>;

  const history = versions.length === 0 ? <p className="text-sm text-text-muted">Sem versões ainda.</p> : (
    <ol className="flex flex-col gap-2">
      {versions.map((v) => (
        <li key={v.id} className="flex items-center gap-3 rounded-md border border-border p-2">
          <span className="w-12 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(v.mediaPaths[0]) ?? ''} alt="" className="w-full rounded-sm" />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium text-text">Versão {v.version} {v.version === c.currentVersion && <Badge tone="accent" size="sm">atual</Badge>}</span>
            <span className="block truncate text-xs text-text-muted">{v.editInstruction ? `“${v.editInstruction}”` : 'Original'} · {dt(v.createdAt)}</span>
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <AutoRefresh active={pending} />
      <PageHeader
        title={c.headline ?? (pending ? 'Gerando…' : 'Criativo')}
        back={{ href: `/w/${slug}/galeria`, label: 'Galeria' }}
        actions={
          c.status === 'succeeded' ? (
            <>
              {src && (
                <a href={src} download={`${slug}-${c.id.slice(0, 8)}.png`} className={buttonStyles({ variant: 'primary' })}>
                  <Download className="size-4" aria-hidden /> Baixar PNG
                </a>
              )}
              <form action={createVariationAction.bind(null, slug, id)}>
                <Button type="submit" variant="secondary" icon={<Sparkles className="size-4" aria-hidden />}>Mais uma variação</Button>
              </form>
              <FavoriteButton size="md" favorite={c.favorite} onToggle={toggleFavoriteAction.bind(null, slug, id)} />
            </>
          ) : null
        }
      />
      <div className="flex flex-col gap-4">
        {c.status === 'failed' && (
          <InlineAlert tone="danger" title="Esta arte falhou">
            {c.error ?? 'Erro inesperado.'} Nada foi cobrado.
            <form action={retryCreativeAction.bind(null, slug, id)} className="mt-2">
              <Button type="submit" variant="secondary" size="sm" icon={<RotateCcw className="size-4" aria-hidden />}>Tentar de novo</Button>
            </form>
          </InlineAlert>
        )}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Section title="Arte">
            <Tabs
              defaultValue="previa"
              tabs={[
                { value: 'previa', label: 'Prévia', content: preview },
                { value: 'texto', label: 'Texto', content: texts },
                { value: 'versoes', label: `Versões (${versions.length})`, content: history },
              ]}
            />
          </Section>
          <div className="flex flex-col gap-4">
            <Section title="De onde veio">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-text-muted">Oferta</dt>
                <dd className="break-words text-text">{offer ? <Link className="text-link hover:underline" href={`/w/${slug}/ofertas/${offer.id}`}>{offer.title}</Link> : '—'}</dd>
                <dt className="text-text-muted">Persona</dt>
                <dd className="break-words text-text">{icp ? <Link className="text-link hover:underline" href={`/w/${slug}/personas/${icp.id}`}>{icp.name}</Link> : 'Sem persona'}</dd>
                <dt className="text-text-muted">Formato</dt>
                <dd className="text-text">{PLACEMENTS[c.placement].label}</dd>
                <dt className="text-text-muted">Situação</dt>
                <dd><Badge size="sm" tone={c.status === 'succeeded' ? 'success' : c.status === 'failed' ? 'danger' : 'neutral'}>{STATUS_LABEL[c.status]}</Badge></dd>
                {c.brief && (<><dt className="text-text-muted">Recado</dt><dd className="break-words text-text">{c.brief}</dd></>)}
                <dt className="text-text-muted">Criada</dt>
                <dd className="text-text">{dt(c.createdAt)}</dd>
                {current && (<><dt className="text-text-muted">Gerador</dt><dd className="text-text-muted">{current.generator}</dd></>)}
              </dl>
            </Section>
            <Section title="Editar falando" description="“Tira o telefone”, “fundo mais claro”… Entra no marco M3, junto com a comparação antes/depois.">
              <p className="text-sm text-text-muted">Por enquanto, gere outra variação ou ajuste a oferta e a persona.</p>
            </Section>
            <div>
              <ConfirmDelete what="esta arte" detail="A arte e todas as versões dela somem da galeria." action={deleteCreativeAction.bind(null, slug, id)} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
