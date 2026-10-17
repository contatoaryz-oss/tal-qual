import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RotateCcw } from 'lucide-react';
import { retryCreativeAction } from '@/app/actions';
import { currentVersion, getWorkspace, listCreatives } from '@/lib/data';
import { fileUrl } from '@/lib/files';
import { PageHeader } from '@/components/page';
import { Badge, InlineAlert } from '@/components/ui/display';
import { Button } from '@/components/ui/button';
import { buttonStyles } from '@/components/ui/button-styles';
import { AutoRefresh } from '@/components/live/auto-refresh';
import { CreativeThumb, STATUS_LABEL } from '@/components/creative-thumb';
import { focusRing } from '@/components/ui/cn';

export const metadata: Metadata = { title: 'Gerando' };

export default async function BatchPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ws = getWorkspace(slug);
  const items = listCreatives(ws.id, { batchId: id }).reverse();
  if (items.length === 0) notFound();
  const pending = items.filter((c) => c.status === 'queued' || c.status === 'processing').length;
  const failed = items.filter((c) => c.status === 'failed').length;
  const done = items.length - pending - failed;

  return (
    <>
      <AutoRefresh active={pending > 0} />
      <PageHeader
        title={pending ? 'Gerando as artes…' : 'Artes prontas'}
        description={`${done} de ${items.length} prontas${failed ? `, ${failed} com erro` : ''}.`}
        back={{ href: `/w/${slug}/criar`, label: 'Criar' }}
        actions={
          <>
            <Link href={`/w/${slug}/criar`} className={buttonStyles({ variant: 'secondary' })}>Gerar outra leva</Link>
            <Link href={`/w/${slug}/galeria`} className={buttonStyles({ variant: 'primary' })}>Ver galeria</Link>
          </>
        }
      />
      <p className="sr-only" role="status" aria-live="polite">{pending ? `${done} de ${items.length} prontas` : 'Todas as artes terminaram.'}</p>
      {failed > 0 && (
        <InlineAlert tone="danger" title="Algumas artes falharam">Nada foi cobrado por elas. Tente de novo em cada uma.</InlineAlert>
      )}
      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy={pending > 0}>
        {items.map((c, i) => {
          const v = currentVersion(ws.id, c);
          const src = fileUrl(v?.mediaPaths[0]);
          return (
            <li key={c.id} className="flex flex-col gap-2">
              {c.status === 'succeeded' ? (
                <Link href={`/w/${slug}/galeria/${c.id}`} className={`block rounded-md ${focusRing}`} aria-label={`Abrir variação ${i + 1}: ${c.headline ?? ''}`}>
                  <CreativeThumb creative={c} src={src} alt="" />
                </Link>
              ) : (
                <CreativeThumb creative={c} src={src} alt="" />
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-text">Variação {i + 1}</span>
                <Badge size="sm" tone={c.status === 'succeeded' ? 'success' : c.status === 'failed' ? 'danger' : 'neutral'}>{STATUS_LABEL[c.status]}</Badge>
              </div>
              {c.status === 'failed' && (
                <>
                  {c.error && <p className="break-words text-xs text-danger">{c.error}</p>}
                  <form action={retryCreativeAction.bind(null, slug, c.id)}>
                    <Button type="submit" variant="secondary" size="sm" icon={<RotateCcw className="size-4" aria-hidden />}>Tentar de novo</Button>
                  </form>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
