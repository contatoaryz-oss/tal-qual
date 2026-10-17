import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus, Users } from 'lucide-react';
import { getWorkspace, listCreatives, listIcps } from '@/lib/data';
import { PageHeader } from '@/components/page';
import { EmptyState } from '@/components/ui/display';
import { EntityCard } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button-styles';

export const metadata: Metadata = { title: 'Personas' };

export default async function IcpsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = await getWorkspace(slug);
  const icps = await listIcps(ws.id);
  const creatives = await listCreatives(ws.id);
  const newBtn = (
    <Link href={`/w/${slug}/personas/nova`} className={buttonStyles({ variant: 'primary' })}>
      <Plus className="size-4" aria-hidden /> Nova persona
    </Link>
  );
  return (
    <>
      <PageHeader title="Personas" description="Para quem o cliente vende. As dores e desejos daqui viram gancho e headline nas artes." actions={icps.length ? newBtn : null} />
      {icps.length === 0 ? (
        <EmptyState
          icon={<Users className="size-7" />}
          title="Nenhuma persona ainda"
          body="Comece pela pessoa que mais compra do cliente hoje. A geração automática entra quando a leitura do site estiver conectada."
          action={<Link href={`/w/${slug}/personas/nova`} className={buttonStyles({ variant: 'accent' })}>Criar a primeira persona</Link>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {icps.map((i) => {
            const n = creatives.filter((c) => c.icpId === i.id).length;
            return (
              <li key={i.id}>
                <EntityCard
                  href={`/w/${slug}/personas/${i.id}`}
                  title={i.name}
                  subtitle={i.title ?? undefined}
                  meta={[
                    ...(i.demographics.age ? [`${i.demographics.age} anos`] : []),
                    ...(i.demographics.location ? [i.demographics.location] : []),
                    `${i.painPoints.length} ${i.painPoints.length === 1 ? 'dor' : 'dores'}`,
                    `${n} ${n === 1 ? 'criativo' : 'criativos'}`,
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
