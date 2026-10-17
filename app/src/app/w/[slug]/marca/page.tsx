import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { getBrandKit, getWorkspace, listStages, readiness } from '@/lib/data';
import { fileUrl } from '@/lib/files';
import {
  removeLogoAction, updateBrandColorsAction, updateBrandTextAction, updateNicheAction, uploadLogoAction,
} from '@/app/actions';
import { PageHeader, Section } from '@/components/page';
import { InlineEdit } from '@/components/ui/inline-edit';
import { InlineAlert } from '@/components/ui/display';
import { buttonStyles } from '@/components/ui/button-styles';
import { ColorEditor, LogoUpload } from './brand-editors';

export const metadata: Metadata = { title: 'Marca' };

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ws = getWorkspace(slug);
  const brand = getBrandKit(ws.id);
  const ready = readiness(ws.id);
  const scrape = listStages(ws.id).find((s) => s.stage === 'scrape');
  const edited = new Set(brand.editedFields);
  const text = (field: 'companyName' | 'headline' | 'toneOfVoice' | 'targetAudience') => updateBrandTextAction.bind(null, slug, field);

  return (
    <>
      <PageHeader
        title="Marca"
        description="O que toda arte deste cliente herda. Clique em qualquer campo para corrigir; o que você edita não é sobrescrito quando o site for lido de novo."
        actions={ready.ready ? (
          <Link href={`/w/${slug}/criar`} className={buttonStyles({ variant: 'accent' })}>
            Criar arte <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      />

      <div className="flex flex-col gap-4">
        {ws.status === 'onboarding' && (
          <InlineAlert tone="info" title="Ainda lendo o negócio">
            Alguns campos vão aparecer em instantes. <Link className="font-semibold underline" href={`/w/${slug}/onboarding`}>Ver progresso</Link>
          </InlineAlert>
        )}
        {scrape?.message?.startsWith('Modo de teste') && (
          <InlineAlert tone="warning" title="Leitura do site ainda não conectada">{scrape.message}</InlineAlert>
        )}
        {!ready.ready && (
          <InlineAlert tone="warning" title="Falta pouco para gerar">
            <ul className="list-inside list-disc">
              {ready.blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </InlineAlert>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Logo" description="O arquivo oficial. Nas artes ele entra como está, sem ser redesenhado.">
            <LogoUpload logoUrl={fileUrl(brand.logoPath)} action={uploadLogoAction.bind(null, slug)} onRemove={removeLogoAction.bind(null, slug)} />
          </Section>

          <Section title="Cores" description="O papel diz onde cada cor entra: fundo da arte, destaque do botão, texto.">
            <ColorEditor initial={brand.colors} onSave={updateBrandColorsAction.bind(null, slug)} />
          </Section>
        </div>

        <Section title="Identidade e voz">
          <div className="grid gap-5 md:grid-cols-2">
            <InlineEdit label="Nome do negócio" value={brand.companyName} placeholder="Como o cliente se apresenta" maxLength={80} edited={edited.has('companyName')} onSave={text('companyName')} />
            <InlineEdit label="Nicho" value={ws.niche} placeholder="Ex.: pisos vinílicos instalados" maxLength={120} onSave={updateNicheAction.bind(null, slug)} />
            <InlineEdit label="Frase da marca" value={brand.headline} placeholder="A promessa principal, numa linha" maxLength={140} edited={edited.has('headline')} onSave={text('headline')} />
            <InlineEdit label="Público" value={brand.targetAudience} placeholder="Para quem o negócio vende" multiline maxLength={400} edited={edited.has('targetAudience')} onSave={text('targetAudience')} />
            <div className="md:col-span-2">
              <InlineEdit label="Tom de voz" value={brand.toneOfVoice} placeholder="Como a marca fala: direto, acolhedor, técnico…" multiline maxLength={400} edited={edited.has('toneOfVoice')} onSave={text('toneOfVoice')} />
            </div>
          </div>
        </Section>

        <Section title="Fontes" description="Usadas na composição das artes.">
          {brand.fonts.length === 0 ? (
            <p className="text-sm text-text-muted">Ainda sem fontes definidas.</p>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {brand.fonts.map((f) => (
                <li key={f.role} className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
                  <span className="font-display text-2xl font-bold text-text" aria-hidden>Aa</span>
                  <span>
                    <span className="block text-sm font-semibold text-text">{f.family}</span>
                    <span className="block text-xs text-text-muted">{f.role === 'heading' ? 'Títulos' : 'Texto'}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-text-muted">Troca de fonte entra junto com o leitor de site real.</p>
        </Section>
      </div>
    </>
  );
}
