# Componentes — especificação

Base: lista de componentes do `replica/recon.md` §5 + os que toda tela precisa (nav, tabs, empty state, skeleton, tooltip).
Tokens: `tokens.json` → classes do Tailwind (`bg-surface`, `text-text-muted`, `border-border-input`, `ring-ring`). Nunca hex solto.
Base acessível: Radix Primitives (Dialog, Select, Popover, Tabs, Tooltip, Toast, Switch, Checkbox, Slider, DropdownMenu).
Ícones: Lucide (ISC/MIT). Sem nenhum ícone, ilustração ou texto do original.

**Regras de foco e motion para todos:**
- Foco: `focus-visible` com anel de 2px `ring` e offset de 2px na cor do fundo. Nunca `outline: none` sem substituto.
- Alvo de toque: no mínimo 40px. Ícone sozinho tem área de 40×40, mesmo que o desenho seja 20px.
- Motion: `duration-base` com `ease-standard`. Com `prefers-reduced-motion`, as durações vão a 0 e o swipe vira botões.
- Loading: o componente mantém o tamanho (sem pulo de layout), e `aria-busy="true"` vai no container.

---

## Ações

```
Button
  variants  primary (marinho no claro; quase branco com texto marinho no escuro), accent (amarelo + texto marinho), secondary (surface + borda input), ghost, danger
  sizes     sm 32px, md 40px, lg 48px · padding x 12/16/20 · gap ícone 8
  states    default, hover (primary-hover / accent-hover / surface-2), active (translateY 1px),
            focus-visible (anel 2px ring), disabled (opacidade 50%, cursor not-allowed, sem hover), loading (spinner no lugar do ícone, label mantido)
  tokens    radius md, font sm/600 (md/600 no lg), shadow none (accent: shadow sm)
  a11y      <button> de verdade; type explícito; loading → aria-busy + aria-disabled, o label continua lido; ícone decorativo aria-hidden
  regra     um primary por área visível; accent é o "gerar"/"aprovar" (no máximo um por tela)
  used on   todas

IconButton
  variants  ghost, secondary
  sizes     sm 32px, md 40px
  states    iguais ao Button
  a11y      aria-label obrigatório; Tooltip com o mesmo texto
  used on   S17, S18, S21, S22

CostBadge
  variants  ok (accent-subtle + on-accent-subtle), over (danger-subtle + danger), free (surface-2 + text-muted)
  content   ícone moeda + "≈ R$ 2,40" ou "grátis"
  states    default, loading (skeleton 64px)
  a11y      texto completo para leitor de tela: "custo estimado: 2 reais e 40 centavos"
  used on   S10, S11, S15, S09 (botão atualizar)
```

## Entrada de dados

```
TextField (inclui o Input URL)
  variants  text, url, search
  sizes     md 40px, lg 48px (S01)
  states    empty (placeholder text-muted), filled, focus (borda ring + anel), validating (spinner à direita),
            error (borda danger + mensagem abaixo com ícone), disabled (surface-2)
  tokens    bg surface, borda 1px border-input, radius md, text md
  a11y      <label> sempre visível (placeholder não é label); erro em aria-describedby + aria-invalid; autocomplete="url" no S01
  copy      label "Site ou @ do Instagram", ajuda "Ex.: massabruta.com.br ou @massabruta"
  used on   S01, S04 (busca), S06, S08, S15

Textarea
  states    iguais ao TextField + contador de caracteres opcional (aria-live polite a cada 20 caracteres)
  used on   S06, S15 (brief), S18 ("o que mudar"), S21 (legenda)

Select / Picker
  base      Radix Select
  variants  single; com ícone; com descrição por opção
  states    fechado, aberto, opção destacada (surface-2), selecionada (check primary), disabled, empty ("Nenhuma oferta ainda — criar")
  a11y      teclado: setas, Enter, Esc, digitar para buscar; o rótulo do valor é lido
  used on   S15 (formato, placement, estilo, oferta, ICP)

MultiSelect (combobox de tags)
  base      Popover + lista com busca
  states    vazio, com chips, aberto, filtrando, sem resultado, item primário (chip accent com "principal")
  a11y      role="combobox" + aria-expanded; chips removíveis com botão "remover X"; Backspace remove o último
  used on   S08 (ICPs da oferta), S11 (plataformas)

Checkbox / Switch
  base      Radix Checkbox / Switch
  states    off, on (bg primary, marca on-primary), indeterminado, focus, disabled
  a11y      label clicável; switch anuncia ligado/desligado
  used on   S15 (usar marca), S17 (filtros), S11

InlineEditField
  variants  texto, lista de itens (dores, objetivos), cor, fonte
  states    leitura (hover mostra borda pontilhada border + ícone lápis), editando (vira TextField com Salvar/Cancelar),
            salvando (spinner), salvo (check success por 1,5s), erro (mensagem danger, valor anterior volta),
            editado-manualmente (ponto accent + tooltip "você editou — reler o site não sobrescreve")
  a11y      leitura é um <button> "Editar tom de voz"; Enter salva, Esc cancela; foco volta para o botão
  used on   S03, S06, S08

ColorSwatch / FontChip
  content   quadrado 40px da cor + hex + papel (primária, fundo...); FontChip = "Aa" na fonte + nome
  states    default, editando (popover com input hex e conta-gotas nativo), focus
  a11y      o hex é lido; nunca só a cor
  used on   S03

UploadDropzone
  variants  doc (PDF até 20 MB), imagem (PNG/JPG/WebP até 10 MB), logo (PNG/SVG)
  states    vazio (borda tracejada border-input), arrastando (borda ring + bg accent-subtle), enviando (barra de progresso primary),
            pronto (miniatura + nome + remover), erro (tipo ou tamanho; mensagem danger com o limite)
  a11y      também abre por botão "Escolher arquivo"; o progresso é anunciado em aria-live
  used on   S03 (logo), S04, S19
```

## Estrutura e navegação

```
AppShell
  layout    sidebar 248px fixa (lg+), header 56px; abaixo de lg a sidebar vira drawer (Dialog) com botão menu
  content   max 1200px, gutter 16px no mobile, 24px no md+
  a11y      link "Pular para o conteúdo"; <nav aria-label="Principal">; <main id="conteudo">
  used on   todas

SidebarNav
  groups    Negócio (Marca, Conhecimento, Personas, Ofertas) · Pesquisa (Concorrentes, Anúncios, Tendências, Desempenho)
            · Criar (Próximos passos, Criar, Galeria, Inspiração) · Calendário (Semana, Swipe)
  states    item default (text-muted), hover (surface-2), ativo (bg accent-subtle, texto on-accent-subtle, barra 3px accent à esquerda), badge de contagem
  a11y      item ativo com aria-current="page"
  used on   todas

WorkspaceSwitcher
  base      DropdownMenu
  content   logo do cliente (ou iniciais em primary) + nome; busca; lista; "Novo cliente"; "Convidar para aprovar"
  states    fechado, aberto, carregando lista, cliente em onboarding (badge "lendo...")
  a11y      botão anuncia "Cliente atual: Massa Bruta"; trocar de cliente move o foco para o título da página
  used on   S22 (header)

Tabs
  base      Radix Tabs
  states    inativa (text-muted), hover, ativa (text + sublinhado 2px primary), focus
  used on   S06, S12, S18 (Prévia / Versões / Qualidade)
```

## Conteúdo e cards

```
EntityCard
  variants  icp, offer, competitor, advertiser, creative (só a moldura; mídia vai no MediaGrid)
  anatomy   título (md/600), subtítulo (sm, text-muted), 1–3 metadados, ações no canto (IconButton ghost)
  states    default (surface + borda border + shadow sm), hover (shadow md), selecionado (borda 2px primary), draft (badge "rascunho"),
            dispensado (opacidade 60% + "desfazer")
  a11y      o card inteiro é um link para o detalhe; as ações internas são botões separados (sem link dentro de link)
  used on   S05, S07, S09, S10, S17

Badge / StatusPill
  variants  neutral, accent, success, warning, danger, info (primary-subtle via surface-2)
  sizes     sm 20px, md 24px · radius full · xs/600
  a11y      cor nunca sozinha: sempre texto ou ícone
  used on   todas

ProgressStepper
  orientation vertical (S02), horizontal compacta (S16)
  step states pendente (círculo border-input), rodando (spinner primary), feito (check success), falhou (x danger + "tentar de novo"), pulado (traço text-muted)
  a11y      <ol>; cada passo com o estado em texto ("Brand kit: concluído"); mudanças anunciadas em aria-live polite
  copy      etapas: Lendo o site · Montando a marca · Entendendo o nicho · Ofertas · Personas · Resumo · Arquétipo
  used on   S02, S16

LiveProgressCard
  content   miniatura (ou skeleton), título, ProgressStepper horizontal, custo, ações (cancelar / ver)
  states    fila, rodando, pronto (mídia + "abrir"), falhou (mensagem + "tentar de novo" + "custo devolvido")
  a11y      role="status"
  used on   S14, S16

MediaGrid
  layout    colunas 2 (mobile) / 3 (md) / 4 (xl), gap 16; proporção de cada item respeitada (4:5, 9:16, 1:1)
  item      mídia + barra inferior (formato, persona, status) + favorito
  states    carregando (skeleton com a proporção certa), vazio (EmptyState), erro de mídia (fundo surface-2 + ícone)
  filters   chips: formato, placement, status, favoritos, só versão atual
  a11y      cada item é um link com alt descrevendo headline + formato; favoritar é botão com aria-pressed
  used on   S17, S23

PlacementPreview
  variants  feed 4:5, story/reels 9:16, quadrado 1:1, LinkedIn 1:1
  anatomy   moldura neutra genérica de post (avatar em iniciais, nome do cliente, legenda truncada) — sem imitar a interface de nenhuma rede
  a11y      a troca de placement é um grupo de rádio
  used on   S18, S21

BeforeAfterSlider
  base      Radix Slider sobre duas imagens sobrepostas
  states    default 50%, arrastando, focus
  a11y      setas movem 5%, Home/End vão às pontas; aria-valuetext "mostrando 50% da versão 2"
  used on   S18

VersionHistory
  content   lista v1…vn: miniatura, instrução de edição ("tira o telefone"), data, custo
  states    atual (badge accent "atual"), hover, restaurando
  a11y      lista com botões "Restaurar versão 1"
  used on   S18

ScoreMeter
  content   número 0–100 grande (2xl/800, display), barra com 4 faixas, rótulo da faixa
  bands     top 80+ (success), forte 60–79 (primary), médio 40–59 (warning), abaixo <40 (danger)
  states    calculando (skeleton), sem nota ("não avaliado" — nunca 0), pronto
  a11y      role="meter" com aria-valuenow/min/max e aria-valuetext "72, forte"
  copy      aviso fixo: "Nota de engajamento estimado. Não é previsão de vendas."
  used on   S18, S19

StrengthsFixesList
  content   duas colunas: "Funciona" (ícone check success) e "Corrigir" (ícone alerta warning, com botão "aplicar" que vira instrução de edição)
  a11y      duas listas com títulos h3
  used on   S18, S19

ProposalCard
  anatomy   área (badge), título, "Por quê" (sm, text-muted), impacto esperado, ações Aprovar (accent) / Discutir (secondary) / Rejeitar (ghost)
  states    proposto, em andamento (stepper compacto), feito (check), rejeitado (motivo obrigatório num Dialog), desatualizado (badge warning)
  a11y      Rejeitar abre Dialog com textarea obrigatória
  used on   S13

Kanban
  columns   Proposto · Em andamento · Feito
  states    coluna vazia (EmptyState compacto), arrastando (card com shadow lg)
  a11y      arrastar é opcional: cada card tem menu "Mover para..."; nada depende só de drag
  used on   S13

SwipeDeck
  anatomy   pilha de 3 cards (PlacementPreview + legenda + horário sugerido), botões Pular (secondary, ícone x) e Aprovar (accent, ícone check)
  states    arrastando (rotação até 8°, selo "aprovar"/"pular" aparece), soltando, gerando substituto (skeleton), fim do deck (EmptyState + "ver semana")
  a11y      setas ← → ou botões; cada decisão anunciada ("Aprovado para terça às 19h"); com reduced-motion, sem animação de arremesso
  used on   S20

WeekCalendar
  grid      7 colunas × horas (7h–22h), hora no fuso do cliente, cabeçalho com dia e data
  slot      vazio (surface; hover mostra "+"), ocupado (card mínimo com miniatura + canal), melhor horário (ponto accent), conflito (borda danger)
  states    carregando, semana vazia, arrastando para outro slot
  mobile    vira lista agrupada por dia
  a11y      <table> com cabeçalhos de linha e coluna; mover pelo menu "Reagendar"; foco por setas dentro da grade
  used on   S21

ChatPanel
  anatomy   mensagens (usuário à direita em surface-2, agente à esquerda em surface), cards inline (LiveProgressCard, EntityCard), composer com Textarea + enviar
  states    vazio (sugestões em chips), digitando (três pontos), streaming, erro (mensagem + "tentar de novo")
  a11y      log com aria-live polite; Enter envia, Shift+Enter quebra linha
  used on   S14
```

## Feedback e sobreposições

```
Dialog (inclui CostConfirmDialog)
  base      Radix Dialog
  sizes     sm 400px, md 560px; tela cheia no mobile
  states    abrindo, aberto, confirmando (botão loading), erro
  CostConfirm content  o que vai rodar, CostBadge, quanto falta para o teto mensal, Confirmar (primary) / Cancelar
  a11y      foco preso; Esc fecha; título em aria-labelledby; o foco volta ao gatilho
  used on   S10, S11, S13 (rejeitar)

Toast
  base      Radix Toast
  variants  info (surface-inverse), success, error (com ação "tentar de novo")
  states    entrando, visível 5s (erro: até fechar), saindo
  a11y      região aria-live; não roubar o foco; pausar ao passar o mouse
  used on   todas

Tooltip
  base      Radix Tooltip · surface-inverse + text-inverse, xs
  a11y      só complementa; nunca guarda informação única
  used on   IconButton, CostBadge, InlineEditField

EmptyState
  anatomy   ícone Lucide 32px em círculo surface-2, título (lg/600), uma frase, uma ação principal
  copy      escrito para cada tela, ex. S05: "Nenhuma persona ainda" / "Gere a partir do que o site e o Instagram do cliente dizem." / [Gerar personas]
  used on   S04, S05, S07, S09, S10, S11, S12, S13, S17, S20, S21

Skeleton
  shape     blocos surface-2 com pulso leve (sem pulso com reduced-motion), na forma exata do conteúdo
  a11y      container com aria-busy="true"
  used on   todas

InlineAlert
  variants  info, success, warning, danger (bg *-subtle, texto na cor, ícone)
  used on   S02 (etapa falhou), S15 ("onboarding incompleto — a arte pode sair fora da marca"), S10 (custo alto)
```
