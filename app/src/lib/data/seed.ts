import type { BrandKit, Icp, Offer, OfferIcp, OnboardingStage, Org, Workspace } from './types';
import { STAGES } from './types';
import type { Db } from './store';

// Dados de exemplo para as telas terem algo real. Cores e textos da Massa Bruta são PROVISÓRIOS:
// troque pelos de verdade na tela Marca (ou rode a leitura do site quando o scraper real entrar).

const now = () => new Date().toISOString();
export const ORG_ID = '10000000-0000-4000-8000-000000000001';
const WS_MB = '20000000-0000-4000-8000-000000000001';
const WS_LONG = '20000000-0000-4000-8000-000000000002';

/** Logo provisório da Massa Bruta, desenhado aqui (não é o logo real). Substitua pelo arquivo oficial na tela Marca. */
const placeholderLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160">
  <rect x="0" y="16" width="128" height="128" rx="20" fill="#E8692C"/>
  <path d="M28 112V48h18l18 30 18-30h18v64H82V78L64 106 46 78v34z" fill="#1F2328"/>
  <text x="150" y="78" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="46" fill="#1F2328">MASSA</text>
  <text x="150" y="128" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="46" fill="#E8692C">BRUTA</text>
</svg>`;

export function seed(): { db: Db; files: { path: string; content: string }[] } {
  const t = now();
  const org: Org = { id: ORG_ID, name: 'Minha agência', monthlyCostCapCents: 50000, currency: 'BRL' };

  const ws = (id: string, name: string, slug: string, ig: string | null, site: string | null, niche: string | null): Workspace => ({
    id, orgId: ORG_ID, name, slug, websiteUrl: site, instagramHandle: ig, businessType: 'local', niche,
    country: 'BR', language: 'pt-BR', timezone: 'America/Sao_Paulo', status: 'ready', createdAt: t, updatedAt: t,
  });

  const doneStages = (workspaceId: string): OnboardingStage[] =>
    STAGES.map((stage) => ({
      workspaceId, stage,
      status: stage === 'archetype' ? 'skipped' : 'done',
      message: stage === 'archetype' ? 'Precisa do formulário do cliente' : null,
      startedAt: t, finishedAt: t,
    }));

  const brand: BrandKit = {
    workspaceId: WS_MB,
    companyName: 'Massa Bruta',
    headline: 'Piso vinílico e laminado já instalado',
    logoPath: `brand/${WS_MB}/logo.svg`,
    colors: [
      { hex: '#1F2328', role: 'primary' },
      { hex: '#E8692C', role: 'accent' },
      { hex: '#F4F1EC', role: 'bg' },
      { hex: '#1F2328', role: 'text' },
    ],
    fonts: [{ family: 'Manrope', role: 'heading' }, { family: 'Inter', role: 'body' }],
    toneOfVoice: 'Direto, prático e confiante. Fala de obra limpa e prazo, sem enrolação.',
    targetAudience: 'Quem quer trocar o piso de casa ou da empresa sem quebra-quebra.',
    proofPoints: [],
    editedFields: [],
    updatedAt: t,
  };

  const icp = (id: string, name: string, title: string, pains: string[], goals: string[], demo: Icp['demographics']): Icp => ({
    id, workspaceId: WS_MB, name, title, description: null, demographics: demo, painPoints: pains, goals,
    objections: [], channels: ['Instagram', 'Facebook'], customerWords: [], origin: 'manual', createdAt: t, updatedAt: t,
  });
  const icps: Icp[] = [
    icp('30000000-0000-4000-8000-000000000001', 'Dono de casa reformando', 'Reforma de um ou dois cômodos',
      ['Medo de obra suja e demorada', 'Não sabe quanto vai custar no final'], ['Piso novo em poucos dias', 'Preço fechado'], { age: '30–55', location: 'Grande Porto Alegre' }),
    icp('30000000-0000-4000-8000-000000000002', 'Empresa trocando o piso', 'Escritório, loja ou clínica',
      ['Não pode parar de funcionar', 'Precisa de nota e prazo'], ['Instalação rápida', 'Acabamento profissional'], { location: 'Grande Porto Alegre' }),
  ];

  const offer = (id: string, title: string, description: string): Offer => ({
    id, workspaceId: WS_MB, title, description, kind: 'service', priceCents: null, currency: 'BRL',
    status: 'active', origin: 'manual', createdAt: t, updatedAt: t,
  });
  const offers: Offer[] = [
    offer('40000000-0000-4000-8000-000000000001', 'Piso vinílico instalado', 'Com rodapé e acabamento, a partir de 30 m².'),
    offer('40000000-0000-4000-8000-000000000002', 'Piso laminado instalado', 'Instalação limpa, sem quebra-quebra.'),
  ];
  const offerIcps: OfferIcp[] = [
    { offerId: offers[0].id, icpId: icps[0].id, workspaceId: WS_MB, isPrimary: true },
    { offerId: offers[0].id, icpId: icps[1].id, workspaceId: WS_MB, isPrimary: false },
    { offerId: offers[1].id, icpId: icps[0].id, workspaceId: WS_MB, isPrimary: true },
  ];

  const longWs = ws(WS_LONG, 'Cliente de exemplo com um nome bem comprido para testar quebra de linha', 'cliente-exemplo-nome-comprido', 'cliente.exemplo', null, null);

  return {
    db: {
      orgs: [org],
      workspaces: [ws(WS_MB, 'Massa Bruta', 'massa-bruta', 'massabruta', null, 'Pisos vinílicos e laminados instalados'), longWs],
      stages: [...doneStages(WS_MB), ...doneStages(WS_LONG)],
      brandKits: [brand, { ...brand, workspaceId: WS_LONG, companyName: longWs.name, headline: null, logoPath: null, colors: [], fonts: [], toneOfVoice: null, targetAudience: null }],
      icps, offers, offerIcps,
      creatives: [], creativeVersions: [], apiCosts: [],
    },
    files: [{ path: `brand/${WS_MB}/logo.svg`, content: placeholderLogo }],
  };
}
