import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3, BookOpen, CalendarDays, Layers, Lightbulb, Moon, MoreHorizontal, Palette, Pencil,
  Plus, Search, Sparkles, Star, Sun, Swords, TrendingUp, Users, Wand2,
} from 'lucide-react';
import tokens from '../../tokens.json';
import { Button, IconButton } from './components/ui/button';
import { TextField, Textarea } from './components/ui/field';
import { Checkbox, Select, Switch, Tabs } from './components/ui/controls';
import { Badge, CostBadge, EmptyState, InlineAlert, ProgressStepper, ScoreMeter, Skeleton } from './components/ui/display';
import { CostConfirmDialog, Dialog, Tooltip } from './components/ui/overlay';
import { EntityCard, NavItem } from './components/ui/card';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="font-display text-xl font-bold text-text">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface p-6 ${className}`}>{children}</div>;
}

const colorRoles = Object.keys(tokens.color.light).filter((k) => k !== 'overlay');

export function DesignPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const palette = tokens.color[theme] as Record<string, string>;

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-display text-sm font-extrabold text-on-primary" aria-hidden>
            DS
          </span>
          <p className="font-display text-md font-bold text-text">Sistema visual</p>
          <Badge tone="accent" size="sm">v1.0</Badge>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={theme === 'light' ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? 'Tema escuro' : 'Tema claro'}
        </Button>
      </header>

      <main id="conteudo" className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-8 md:px-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-text">Componentes e tokens</h1>
          <p className="mt-2 max-w-2xl text-md text-text-muted">
            Marinho para estrutura e ação principal; amarelo para destaque, aprovação e o que é novo. Toda cor aqui sai de um token.
          </p>
        </div>

        <Section id="cores" title="Cores">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {colorRoles.map((role) => (
              <li key={role} className="overflow-hidden rounded-md border border-border bg-surface">
                <div className="h-14 border-b border-border" style={{ background: `var(--color-${role})` }} />
                <div className="p-2">
                  <p className="text-xs font-semibold text-text">{role}</p>
                  <p className="font-mono text-xs text-text-muted">{palette[role]}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="tipo" title="Tipografia">
          <Panel className="flex flex-col gap-3">
            <p className="font-display text-3xl font-extrabold text-text">Manrope 40 — títulos de página</p>
            <p className="font-display text-2xl font-bold text-text">Manrope 32 — número de destaque</p>
            <p className="font-display text-xl font-bold text-text">Manrope 24 — título de seção</p>
            <p className="text-lg font-semibold text-text">Inter 20 — título de card</p>
            <p className="text-md text-text">Inter 16 — corpo. Brand DNA, personas e ofertas do cliente.</p>
            <p className="text-sm text-text-muted">Inter 14 — legenda, metadado, ajuda de campo.</p>
            <p className="text-xs text-text-muted">Inter 12 — badge, timestamp, rodapé de card.</p>
          </Panel>
        </Section>

        <Section id="botoes" title="Botões">
          <Panel className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={<Plus className="size-4" aria-hidden />}>Novo cliente</Button>
              <Button variant="accent" icon={<Sparkles className="size-4" aria-hidden />}>Gerar criativos</Button>
              <Button variant="secondary">Cancelar</Button>
              <Button variant="ghost">Ver todos</Button>
              <Button variant="danger">Apagar cliente</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeno 32</Button>
              <Button size="md">Médio 40</Button>
              <Button size="lg">Grande 48</Button>
              <Button loading>Gerando</Button>
              <Button disabled>Indisponível</Button>
              <Tooltip content="Mais ações">
                <IconButton label="Mais ações" variant="secondary"><MoreHorizontal className="size-4" aria-hidden /></IconButton>
              </Tooltip>
              <IconButton label="Editar"><Pencil className="size-4" aria-hidden /></IconButton>
            </div>
          </Panel>
        </Section>

        <Section id="campos" title="Campos">
          <Panel className="grid gap-6 md:grid-cols-2">
            <TextField label="Site ou @ do Instagram" placeholder="massabruta.com.br ou @massabruta" hint="Lemos o site e o perfil para montar a marca." fieldSize="lg" type="url" />
            <TextField label="Site ou @ do Instagram" defaultValue="massabruta.com" validating fieldSize="lg" />
            <TextField label="Nome da oferta" defaultValue="Piso vinílico instalado" />
            <TextField label="Preço" defaultValue="abc" error="Use só números. Ex.: 89,90" />
            <TextField label="Nicho" defaultValue="Pisos e revestimentos" disabled />
            <Textarea label="O que mudar nesta arte?" placeholder="Ex.: tira o telefone e deixa o fundo mais claro" />
            <Select
              label="Formato"
              placeholder="Escolher formato"
              options={[
                { value: 'image', label: 'Imagem de anúncio', description: 'Uma arte, até 4 variações' },
                { value: 'carousel', label: 'Carrossel', description: 'Gancho, história e chamada, 2 a 10 telas' },
                { value: 'photo_ad', label: 'Foto real + logo', description: 'Sem IA na arte, logo exato' },
              ]}
            />
            <div className="flex flex-col gap-4 pt-1">
              <Checkbox label="Usar a marca do cliente" defaultChecked />
              <Checkbox label="Só versão atual" />
              <Switch label="Mostrar só favoritos" defaultChecked />
              <Switch label="Sincronizar métricas" disabled />
            </div>
          </Panel>
        </Section>

        <Section id="status" title="Badges, custo e alertas">
          <Panel className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">rascunho</Badge>
              <Badge tone="accent" icon={<Star className="size-3" aria-hidden />}>principal</Badge>
              <Badge tone="primary">ICP</Badge>
              <Badge tone="success">pronto</Badge>
              <Badge tone="warning">desatualizado</Badge>
              <Badge tone="danger">falhou</Badge>
              <CostBadge cents={240} />
              <CostBadge cents={0} />
              <CostBadge cents={2800} over />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InlineAlert tone="info" title="Leitura do site em andamento">Você pode editar a marca enquanto isso.</InlineAlert>
              <InlineAlert tone="success" title="Marca pronta">Logo, cores, fontes e tom de voz extraídos.</InlineAlert>
              <InlineAlert tone="warning" title="Onboarding incompleto">A arte pode sair fora da marca.</InlineAlert>
              <InlineAlert tone="danger" title="Não conseguimos abrir o site">Confira o endereço ou use o @ do Instagram.</InlineAlert>
            </div>
          </Panel>
        </Section>

        <Section id="progresso" title="Progresso e nota">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel>
              <p className="mb-4 text-sm font-semibold text-text">Lendo o negócio</p>
              <ProgressStepper
                steps={[
                  { label: 'Lendo o site', state: 'done' },
                  { label: 'Montando a marca', state: 'done' },
                  { label: 'Entendendo o nicho', state: 'running', message: 'Comparando com 12 páginas' },
                  { label: 'Ofertas', state: 'failed', message: 'Nenhum preço encontrado — cadastre à mão' },
                  { label: 'Personas', state: 'pending' },
                  { label: 'Arquétipo', state: 'skipped', message: 'Precisa do formulário do cliente' },
                ]}
              />
            </Panel>
            <Panel className="flex flex-col gap-6">
              <ScoreMeter score={72} />
              <ScoreMeter score={34} />
              <ScoreMeter score={null} />
            </Panel>
          </div>
        </Section>

        <Section id="cards" title="Cards e navegação">
          <div className="grid gap-4 lg:grid-cols-[248px_1fr]">
            <nav aria-label="Principal" className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Negócio</p>
              <NavItem href="#" icon={<Palette />} label="Marca" />
              <NavItem href="#" icon={<BookOpen />} label="Conhecimento" />
              <NavItem href="#" icon={<Users />} label="Personas" active count={3} />
              <NavItem href="#" icon={<Layers />} label="Ofertas" count={5} />
              <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Pesquisa</p>
              <NavItem href="#" icon={<Swords />} label="Concorrentes" />
              <NavItem href="#" icon={<TrendingUp />} label="Tendências" />
              <NavItem href="#" icon={<BarChart3 />} label="Desempenho" />
              <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Criar</p>
              <NavItem href="#" icon={<Lightbulb />} label="Próximos passos" count={4} />
              <NavItem href="#" icon={<Wand2 />} label="Criar" />
              <NavItem href="#" icon={<CalendarDays />} label="Semana" />
            </nav>
            <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <EntityCard href="#" title="Dono de casa reformando" subtitle="Quer piso bonito sem quebra-quebra" meta={['35–55 anos', 'Canoas e região', 'Instagram, Google']} selected
                actions={<IconButton label="Editar persona" size="sm"><Pencil className="size-4" aria-hidden /></IconButton>} />
              <EntityCard href="#" title="Piso vinílico instalado" subtitle="Com rodapé, a partir de 30 m²" meta={['R$ 89,90/m²', '2 personas']}
                actions={<IconButton label="Editar oferta" size="sm"><Pencil className="size-4" aria-hidden /></IconButton>} />
              <EntityCard href="#" title="Concorrente exemplo" subtitle="Anuncia preço por m² e prazo" meta={['14 anúncios ativos', 'confiança 82%']} draft />
            </div>
          </div>
        </Section>

        <Section id="tabs" title="Abas, diálogos e estados vazios">
          <Panel className="flex flex-col gap-6">
            <Tabs
              defaultValue="previa"
              tabs={[
                { value: 'previa', label: 'Prévia', content: <div className="grid grid-cols-3 gap-3"><Skeleton className="aspect-[4/5]" /><Skeleton className="aspect-[4/5]" /><Skeleton className="aspect-[4/5]" /></div> },
                { value: 'versoes', label: 'Versões', content: <p className="text-sm text-text-muted">v2 — "tira o telefone" · v1 — original</p> },
                { value: 'qualidade', label: 'Qualidade', content: <ScoreMeter score={81} /> },
              ]}
            />
            <div className="flex flex-wrap gap-3">
              <CostConfirmDialog
                trigger={<Button variant="secondary" icon={<Search className="size-4" aria-hidden />}>Buscar anúncios do nicho</Button>}
                what="Busca de anunciantes de pisos vinílicos no Brasil, amostra de 30 anúncios."
                cents={2200}
                remainingCents={31800}
              />
              <Dialog
                trigger={<Button variant="ghost">Rejeitar sugestão</Button>}
                size="sm"
                title="Por que rejeitar?"
                description="O motivo ajuda as próximas sugestões."
                footer={<Button variant="primary">Rejeitar</Button>}
              >
                <Textarea label="Motivo" placeholder="Ex.: o cliente não faz promoção de preço" />
              </Dialog>
            </div>
            <EmptyState
              icon={<Users className="size-7" />}
              title="Nenhuma persona ainda"
              body="Gere a partir do que o site e o Instagram do cliente dizem, ou crie à mão."
              action={<Button variant="accent" icon={<Sparkles className="size-4" aria-hidden />}>Gerar personas</Button>}
            />
          </Panel>
        </Section>
      </main>
    </div>
  );
}
