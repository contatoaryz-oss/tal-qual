// Mapa de telas do recon (S01–S24) → rotas. Fonte única para menu, stubs e testes.

export type ScreenId = `S${string}`;
export interface Screen {
  id: ScreenId;
  title: string;
  path: (slug: string) => string;
  milestone: 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
  nav?: { group: 'Negócio' | 'Pesquisa' | 'Criar' | 'Calendário'; icon: string };
}

export const SCREENS: Screen[] = [
  { id: 'S01', title: 'Novo cliente', path: () => '/novo', milestone: 'M0' },
  { id: 'S02', title: 'Lendo o negócio', path: (s) => `/w/${s}/onboarding`, milestone: 'M0' },
  { id: 'S03', title: 'Marca', path: (s) => `/w/${s}/marca`, milestone: 'M0', nav: { group: 'Negócio', icon: 'palette' } },
  { id: 'S04', title: 'Conhecimento', path: (s) => `/w/${s}/conhecimento`, milestone: 'M1', nav: { group: 'Negócio', icon: 'book' } },
  { id: 'S05', title: 'Personas', path: (s) => `/w/${s}/personas`, milestone: 'M0', nav: { group: 'Negócio', icon: 'users' } },
  { id: 'S06', title: 'Persona', path: (s) => `/w/${s}/personas/[id]`, milestone: 'M0' },
  { id: 'S07', title: 'Ofertas', path: (s) => `/w/${s}/ofertas`, milestone: 'M0', nav: { group: 'Negócio', icon: 'layers' } },
  { id: 'S08', title: 'Oferta', path: (s) => `/w/${s}/ofertas/[id]`, milestone: 'M0' },
  { id: 'S09', title: 'Concorrentes', path: (s) => `/w/${s}/concorrentes`, milestone: 'M2', nav: { group: 'Pesquisa', icon: 'swords' } },
  { id: 'S10', title: 'Anúncios do nicho', path: (s) => `/w/${s}/anuncios`, milestone: 'M2', nav: { group: 'Pesquisa', icon: 'megaphone' } },
  { id: 'S11', title: 'Tendências', path: (s) => `/w/${s}/tendencias`, milestone: 'M2', nav: { group: 'Pesquisa', icon: 'trending' } },
  { id: 'S12', title: 'Desempenho', path: (s) => `/w/${s}/desempenho`, milestone: 'M2', nav: { group: 'Pesquisa', icon: 'chart' } },
  { id: 'S13', title: 'Próximos passos', path: (s) => `/w/${s}/proximos-passos`, milestone: 'M4', nav: { group: 'Criar', icon: 'lightbulb' } },
  { id: 'S14', title: 'Agente', path: (s) => `/w/${s}/agente`, milestone: 'M4', nav: { group: 'Criar', icon: 'bot' } },
  { id: 'S15', title: 'Criar', path: (s) => `/w/${s}/criar`, milestone: 'M0', nav: { group: 'Criar', icon: 'wand' } },
  { id: 'S16', title: 'Gerando', path: (s) => `/w/${s}/criar/lote/[id]`, milestone: 'M0' },
  { id: 'S17', title: 'Galeria', path: (s) => `/w/${s}/galeria`, milestone: 'M0', nav: { group: 'Criar', icon: 'images' } },
  { id: 'S18', title: 'Criativo', path: (s) => `/w/${s}/galeria/[id]`, milestone: 'M0' },
  { id: 'S19', title: 'Nota do anúncio', path: (s) => `/w/${s}/nota`, milestone: 'M4', nav: { group: 'Criar', icon: 'gauge' } },
  { id: 'S20', title: 'Swipe', path: (s) => `/w/${s}/swipe`, milestone: 'M4', nav: { group: 'Calendário', icon: 'swipe' } },
  { id: 'S21', title: 'Semana', path: (s) => `/w/${s}/semana`, milestone: 'M3', nav: { group: 'Calendário', icon: 'calendar' } },
  { id: 'S22', title: 'Clientes', path: () => '/', milestone: 'M0' },
  { id: 'S23', title: 'Inspiração', path: (s) => `/w/${s}/inspiracao`, milestone: 'M5', nav: { group: 'Criar', icon: 'sparkles' } },
  { id: 'S24', title: 'Origem do criativo', path: (s) => `/w/${s}/galeria/[id]/origem`, milestone: 'M5' },
];

export const screen = (id: ScreenId) => SCREENS.find((s) => s.id === id)!;
export const NAV_GROUPS = ['Negócio', 'Pesquisa', 'Criar', 'Calendário'] as const;
