import type { Metadata } from 'next';
import { createIcpAction } from '@/app/actions';
import { getWorkspace } from '@/lib/data';
import { PageHeader } from '@/components/page';
import { IcpForm } from '../icp-form';

export const metadata: Metadata = { title: 'Nova persona' };

export default async function NewIcpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await getWorkspace(slug);
  return (
    <>
      <PageHeader title="Nova persona" back={{ href: `/w/${slug}/personas`, label: 'Personas' }} />
      <div className="rounded-lg border border-border bg-surface p-4 md:p-6">
        <IcpForm action={createIcpAction.bind(null, slug)} submitLabel="Criar persona" />
      </div>
    </>
  );
}
