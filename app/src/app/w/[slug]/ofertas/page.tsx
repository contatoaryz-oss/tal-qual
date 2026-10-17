import Link from 'next/link';
import type { Metadata } from 'next';
import { Layers, Plus } from 'lucide-react';
import { getWorkspace, listCreatives, listOfferIcps, listOffers } from '@/lib/data';
import { PageHeader } from '@/components/page';
import { EmptyState } from '@/components/ui/display';
import { EntityCard } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button-styles';
import { brl, kindLabel } from '@/lib/labels';

export const metadata: Metadata = { title: 'Ofertas' };

export default async function OffersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspace(slug);
  const offers = await listOffers(ws.id);
  const links = await listOfferIcps(ws.id);
  const creatives = await listCreatives(ws.id);
  const newBtn = (
    <Link href={`/w/${slug}/ofertas/nova`} className={buttonStyles({ variant: 'primary' })}>
      <Plus className="size-4" aria-hidden /> Nova oferta
    </Link>
  );
  return (
    <>
      <PageHeader title="Ofertas" description="O que o cliente vende. Toda arte nasce de uma oferta." actions={offers.length ? newBtn : null} />
      {offers.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-7" />}
          title="Nenhuma oferta ainda"
          body="Cadastre o serviço ou produto que o cliente mais quer vender agora. É o mínimo para gerar a primeira arte."
          action={<Link href={`/w/${slug}/ofertas/nova`} className={buttonStyles({ variant: 'accent' })}>Cadastrar oferta</Link>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((o) => {
            const nIcp = links.filter((l) => l.offerId === o.id).length;
            const nCr = creatives.filter((c) => c.offerId === o.id).length;
            return (
              <li key={o.id}>
                <EntityCard
                  href={`/w/${slug}/ofertas/${o.id}`}
                  title={o.title}
                  subtitle={o.description ?? undefined}
                  draft={o.status === 'draft'}
                  meta={[
                    kindLabel(o.kind),
                    o.priceCents !== null ? brl(o.priceCents) : 'sob orçamento',
                    `${nIcp} ${nIcp === 1 ? 'persona' : 'personas'}`,
                    `${nCr} ${nCr === 1 ? 'criativo' : 'criativos'}`,
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
