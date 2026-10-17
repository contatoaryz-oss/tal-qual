import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { deleteOfferAction, setPrimaryIcpAction, toggleOfferIcpAction, updateOfferAction } from '@/app/actions';
import { NotFoundError, getOffer, getWorkspace, listIcps, listOfferIcps } from '@/lib/data';
import { PageHeader, Section } from '@/components/page';
import { InlineAlert } from '@/components/ui/display';
import { ConfirmDelete } from '@/components/confirm-delete';
import { buttonStyles } from '@/components/ui/button-styles';
import { IcpLinks, OfferForm } from '../offer-form';

export const metadata: Metadata = { title: 'Oferta' };

export default async function OfferPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { slug, id } = await params;
  const { salvo } = await searchParams;
  const ws = getWorkspace(slug);
  let offer;
  try { offer = getOffer(ws.id, id); } catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
  const links = listOfferIcps(ws.id).filter((l) => l.offerId === id);

  return (
    <>
      <PageHeader
        title={offer.title}
        back={{ href: `/w/${slug}/ofertas`, label: 'Ofertas' }}
        actions={
          <>
            <Link href={`/w/${slug}/criar?oferta=${id}`} className={buttonStyles({ variant: 'accent' })}>Criar arte desta oferta</Link>
            <ConfirmDelete what="esta oferta" detail="Os criativos feitos com ela continuam na galeria, só perdem o vínculo." action={deleteOfferAction.bind(null, slug, id)} />
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {salvo && <InlineAlert tone="success" title="Oferta criada" />}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Section title="Detalhes">
            <OfferForm offer={offer} action={updateOfferAction.bind(null, slug, id)} submitLabel="Salvar alterações" />
          </Section>
          <Section title="Personas" description="Para quem é esta oferta. A principal é usada por padrão na hora de criar.">
            <IcpLinks
              icps={listIcps(ws.id)}
              links={links}
              onToggle={toggleOfferIcpAction.bind(null, slug, id)}
              onPrimary={setPrimaryIcpAction.bind(null, slug, id)}
            />
          </Section>
        </div>
      </div>
    </>
  );
}
