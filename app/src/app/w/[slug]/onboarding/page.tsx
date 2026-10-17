import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getWorkspace, listStages } from '@/lib/data';
import type { StageKey } from '@/lib/data/types';
import { PageHeader } from '@/components/page';
import { InlineAlert, ProgressStepper } from '@/components/ui/display';
import { buttonStyles } from '@/components/ui/button-styles';
import { AutoRefresh } from '@/components/live/auto-refresh';

export const metadata: Metadata = { title: 'Lendo o negócio' };

const LABEL: Record<StageKey, string> = {
  scrape: 'Lendo o site e o Instagram',
  brand_kit: 'Montando a marca',
  niche: 'Entendendo o nicho',
  offers: 'Ofertas',
  icps: 'Personas',
  knowledge: 'Resumo do negócio',
  archetype: 'Arquétipo',
};

export default async function OnboardingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = getWorkspace(slug);
  const stages = listStages(ws.id);
  const running = ws.status === 'onboarding';
  const failed = stages.filter((s) => s.status === 'failed');
  const source = ws.instagramHandle ? `@${ws.instagramHandle}` : ws.websiteUrl;

  return (
    <>
      <AutoRefresh active={running} />
      <PageHeader title={running ? 'Lendo o negócio…' : 'Leitura concluída'} description={`Fonte: ${source}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border border-border bg-surface p-6" aria-busy={running}>
          <ProgressStepper steps={stages.map((s) => ({ label: LABEL[s.stage], state: s.status, message: s.message ?? undefined }))} />
        </div>
        <div className="flex flex-col gap-4">
          {running && (
            <InlineAlert tone="info" title="Isso leva alguns segundos">
              Você pode sair desta tela. A leitura continua e o cliente aparece como “lendo…” na lista.
            </InlineAlert>
          )}
          {failed.length > 0 && (
            <InlineAlert tone="danger" title="Algumas etapas falharam">
              {failed.map((f) => LABEL[f.stage]).join(', ')}. Você pode preencher essas partes à mão.
            </InlineAlert>
          )}
          {!running && (
            <>
              <InlineAlert tone="success" title="Rascunho da marca pronto">
                Confira as cores, envie o logo oficial e cadastre a primeira oferta. Depois é só gerar.
              </InlineAlert>
              <div className="flex flex-wrap gap-2">
                <Link href={`/w/${slug}/marca`} className={buttonStyles({ variant: 'accent' })}>
                  Revisar a marca <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href={`/w/${slug}/ofertas/nova`} className={buttonStyles({ variant: 'secondary' })}>Cadastrar oferta</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
