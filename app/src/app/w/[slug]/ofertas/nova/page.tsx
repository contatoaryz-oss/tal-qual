import type { Metadata } from 'next';
import { createOfferAction } from '@/app/actions';
import { getWorkspace, listIcps } from '@/lib/data';
import { PageHeader } from '@/components/page';
import { OfferForm } from '../offer-form';

export const metadata: Metadata = { title: 'Nova oferta' };

export default async function NewOfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspace(slug);
  return (
    <>
      <PageHeader title="Nova oferta" back={{ href: `/w/${slug}/ofertas`, label: 'Ofertas' }} />
      <div className="rounded-lg border border-border bg-surface p-4 md:p-6">
        <OfferForm icps={await listIcps(ws.id)} action={createOfferAction.bind(null, slug)} submitLabel="Criar oferta" />
      </div>
    </>
  );
}
