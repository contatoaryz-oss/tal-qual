import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { deleteIcpAction, updateIcpAction } from '@/app/actions';
import { NotFoundError, getIcp, getWorkspace, listCreatives, listOfferIcps, listOffers } from '@/lib/data';
import { PageHeader, Section } from '@/components/page';
import { InlineAlert } from '@/components/ui/display';
import { ConfirmDelete } from '@/components/confirm-delete';
import { buttonStyles } from '@/components/ui/button-styles';
import { IcpForm } from '../icp-form';

export const metadata: Metadata = { title: 'Persona' };

export default async function IcpPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { slug, id } = await params;
  const { salvo } = await searchParams;
  const ws = getWorkspace(slug);
  let icp;
  try { icp = getIcp(ws.id, id); } catch (e) { if (e instanceof NotFoundError) notFound(); throw e; }
  const offerIds = new Set(listOfferIcps(ws.id).filter((l) => l.icpId === id).map((l) => l.offerId));
  const offers = listOffers(ws.id).filter((o) => offerIds.has(o.id));
  const made = listCreatives(ws.id).filter((c) => c.icpId === id).length;

  return (
    <>
      <PageHeader
        title={icp.name}
        description={icp.title ?? undefined}
        back={{ href: `/w/${slug}/personas`, label: 'Personas' }}
        actions={
          <>
            <Link href={`/w/${slug}/criar?persona=${id}`} className={buttonStyles({ variant: 'accent' })}>Criar arte para esta persona</Link>
            <ConfirmDelete what="esta persona" detail="Os criativos feitos para ela continuam na galeria, só perdem o vínculo." action={deleteIcpAction.bind(null, slug, id)} />
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {salvo && <InlineAlert tone="success" title="Persona criada" />}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Section title="Perfil">
            <IcpForm icp={icp} action={updateIcpAction.bind(null, slug, id)} submitLabel="Salvar alterações" />
          </Section>
          <Section title="Ligações">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-text-muted">Ofertas para ela</dt>
                <dd className="mt-1">
                  {offers.length === 0 ? (
                    <span className="text-text-muted">Nenhuma. Vincule na página da oferta.</span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {offers.map((o) => (
                        <li key={o.id}><Link className="font-medium text-link hover:underline" href={`/w/${slug}/ofertas/${o.id}`}>{o.title}</Link></li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Criativos feitos para ela</dt>
                <dd className="mt-1 font-semibold text-text">{made}</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}
