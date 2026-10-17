import Link from 'next/link';
import type { Metadata } from 'next';
import { Layers } from 'lucide-react';
import { createCreativesAction } from '@/app/actions';
import { getWorkspace, listIcps, listOfferIcps, listOffers, readiness } from '@/lib/data';
import { PLACEMENTS, type Placement } from '@/lib/data/types';
import { providers } from '@/lib/jobs/providers';
import { PageHeader } from '@/components/page';
import { EmptyState, InlineAlert } from '@/components/ui/display';
import { buttonStyles } from '@/components/ui/button-styles';
import { CreateForm } from './create-form';

export const metadata: Metadata = { title: 'Criar' };

export default async function CreatePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ oferta?: string; persona?: string }> }) {
  const { slug } = await params;
  const q = await searchParams;
  const ws = getWorkspace(slug);
  const offers = listOffers(ws.id);
  const icps = listIcps(ws.id);
  const links = listOfferIcps(ws.id);
  const ready = readiness(ws.id);

  if (offers.length === 0) {
    return (
      <>
        <PageHeader title="Criar" />
        <EmptyState
          icon={<Layers className="size-7" />}
          title="Cadastre uma oferta primeiro"
          body="Toda arte nasce de algo que o cliente vende. Com uma oferta cadastrada, já dá para gerar."
          action={<Link href={`/w/${slug}/ofertas/nova`} className={buttonStyles({ variant: 'accent' })}>Cadastrar oferta</Link>}
        />
      </>
    );
  }

  const primaryByOffer = Object.fromEntries(offers.map((o) => [o.id, links.find((l) => l.offerId === o.id && l.isPrimary)?.icpId]));
  const offerDefault = offers.some((o) => o.id === q.oferta) ? q.oferta : undefined;
  const icpDefault = icps.some((i) => i.id === q.persona) ? q.persona : undefined;
  const placements = (Object.keys(PLACEMENTS) as Placement[])
    .filter((p) => ['instagram_portrait', 'instagram_story', 'instagram_square'].includes(p))
    .map((p) => ({ value: p, label: PLACEMENTS[p].label.replace(/ \(.*\)/, ''), ratio: PLACEMENTS[p].ratio }));

  return (
    <>
      <PageHeader title="Criar" description="Escolha a oferta e a persona. A arte sai na marca do cliente, com o logo oficial e o texto composto por cima." />
      <div className="flex flex-col gap-4">
        {!ready.ready && (
          <InlineAlert tone="danger" title="Ainda não dá para gerar">
            <ul className="list-inside list-disc">{ready.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            <Link href={`/w/${slug}/marca`} className="mt-1 inline-block font-semibold underline">Ir para Marca</Link>
          </InlineAlert>
        )}
        {ready.ready && ready.warnings.length > 0 && (
          <InlineAlert tone="warning" title="Dá para gerar, mas vale saber">
            <ul className="list-inside list-disc">{ready.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </InlineAlert>
        )}
        <InlineAlert tone="info" title="Modo de teste">
          A copy sai de modelos prontos e o fundo é abstrato, nas cores da marca. Claude e o gerador de imagem entram no backend; o logo e a composição já são os definitivos.
        </InlineAlert>
        <div className="rounded-lg border border-border bg-surface p-4 md:p-6">
          <CreateForm
            offers={offers.map((o) => ({ id: o.id, title: o.title }))}
            icps={icps.map((i) => ({ id: i.id, name: i.name }))}
            primaryByOffer={primaryByOffer}
            placements={placements}
            defaults={{ offerId: offerDefault, icpId: icpDefault }}
            costPerArtCents={providers.image.costCents}
            disabled={!ready.ready}
            action={createCreativesAction.bind(null, slug)}
          />
        </div>
      </div>
    </>
  );
}
