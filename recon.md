# Recon — Vibiz (fatia: análise do negócio → conteúdo original + anúncios com potencial de conversão)

Data: 17/10/2026 · Plataforma: web (app em vibiz.ai + servidor MCP) · Para: uso próprio de Ariel, prestador de serviço de social media com vários clientes.

## 0. Aviso antes de tudo — termos de uso

Os Termos da Vibiz (atualizados em set/2026), seção 9 "Acceptable use", proíbem usar o serviço para "scrape, copy, reverse engineer or resell the Service, or use it to build a competing product". A seção 11 diz que os termos não dão direito de copiar o serviço.

Consequência para este recon:
- **Não usei a sua conta Vibiz** (nem o link do seu workspace, que redireciona para login, nem o conector MCP para ler dados do workspace). Tudo aqui vem de páginas públicas: site, pricing, help center, docs e a referência pública de ferramentas do MCP.
- O que se reconstrói é **funcionalidade e padrão de UX**, clean-room. Nada de código, endpoints privados, modelos, prompts, templates ou assets deles.
- Uso interno no seu negócio é bem diferente de revender, mas se um dia a ferramenta virar produto (ex.: dentro do Trama ou do Iluminaz), vale reavaliar com um advogado. Não sou advogado.

## 1. Escopo

| pergunta | resposta |
| --- | --- |
| App / plataforma | Vibiz, web app + MCP |
| Fatia | Entender o negócio (marca, público, ofertas, concorrência, tendências, desempenho próprio) → gerar posts/carrosséis/criativos e copy de anúncio fundamentados nisso → checar qualidade → aprovar para o calendário |
| Fora da fatia | Publicar nas redes, subir/gerenciar campanhas pagas, inbox/DM, e-mail, outreach, CRM/leads, landing pages/funis/Stripe, vídeo UGC, Product Studio de e-commerce, Slack |
| Para quem | Ariel operando vários clientes (Dom Pedro, Top Embalagens, Casa Nostra, Marujos, Massa Bruta, Hedone etc.) — um workspace por cliente |

**Core loop:** colar site/Instagram do cliente → Brand DNA + personas + ofertas + concorrência + tendências → recomendações → gerar conteúdo por persona/oferta → revisar/editar falando → aprovar (swipe) → calendário.

## 2. Fontes

| # | fonte | URL | o que deu |
| --- | --- | --- | --- |
| 1 | Home / marketing | https://www.vibiz.ai | core loop em 4 passos, Blitz (swipe), edição por fala com versões, Autopilot (cards de próxima ação), canais |
| 2 | Pricing | https://www.vibiz.ai/pricing | Pro US$79 (250 gerações, 50 posts, 5 marcas) · Ultra US$229 (500 gerações, posts e marcas ilimitados) · créditos |
| 3 | Help center | https://www.vibiz.ai/help | lista de telas reais: agente, criar imagem, UGC, Blitz, agendar post, campanha, brand kit |
| 4 | Docs | https://www.vibiz.ai/docs | dois produtos: MCP + SDK de analytics |
| 5 | Docs MCP | https://www.vibiz.ai/docs/mcp | o que o MCP faz |
| 6 | Referência de tools MCP (pública) | https://www.vibiz.ai/docs/mcp/tools | **melhor fonte de modelo de dados**: ICP, ofertas, links oferta↔ICP, criativos, qualidade, propostas, memória |
| 7 | Para agências | https://www.vibiz.ai/for/agencies | um workspace por cliente, convite de time/cliente, aprovação antes de publicar |
| 8 | AI ad generator | https://www.vibiz.ai/ai-ad-generator | até 20 variantes por lote, 10 proporções, copy por até 3 segmentos de público, remix de referência |
| 9 | Social posts | https://www.vibiz.ai/social-posts | calendário mensal proposto (lançamento, prova, bastidor, oferta), legenda por canal |
| 10 | Recreate ad creatives | https://www.vibiz.ai/recreate-ad-creatives | remix de referência/anúncio vencedor em novas direções |
| 11 | Ad score (Treviso) | https://www.vibiz.ai/trend | score de engajamento por imagem (CLIP + LightGBM, 13.622 anúncios Meta); achado: conversão quase não é previsível só pela imagem |
| 12 | Termos | https://www.vibiz.ai/terms | §9 proíbe construir concorrente |
| 13 | G2 | https://www.g2.com/products/vibiz/discuss | "Business DNA", funil TOFU/MOFU/BOFU, projeção de receita |
| 14 | GetApp | https://www.getapp.com/all-software/a/vibiz/ | resumo do produto e público |

Sem changelog público e sem app store (é web). Vídeos do help center não foram assistidos quadro a quadro — telas abaixo marcadas por confiança.

## 3. Inventário de telas

Confiança: **A** = visto em página pública/vídeo; **M** = inferido da referência de tools; **B** = suposição.

| ID | tela | como chega | propósito | componentes-chave | estados vistos/esperados | conf. |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Adicionar negócio | botão "novo workspace" / onboarding | colar site ou @Instagram | input URL, botão analisar | vazio, URL inválida, inacessível | A |
| S02 | Progresso do onboarding | após S01 | acompanhar leitura do site | etapas (workspace, brand kit, tipo de negócio/nicho, catálogo, resumo), poll | carregando, etapa falhou, pronto | M |
| S03 | Brand DNA / Brand kit | sidebar "Your business" | logo, cores, fontes, voz, público; clicar para corrigir | swatches, font chips, campos editáveis inline | incompleto, sem logo, editado | A |
| S04 | Base de conhecimento | sidebar | resumo do negócio + PDFs enviados | texto do resumo, upload, lista de docs com status | vazio, processando, busca sem resultado | M |
| S05 | Lista de ICPs (personas) | sidebar | ver/criar personas | cards (nome, cargo, descrição curta), criar manual, gerar | vazio, gerando | M |
| S06 | Detalhe do ICP | clicar card | demografia, dores, objetivos, canais | seções editáveis, link "o que foi criado para este ICP" | — | M |
| S07 | Lista de ofertas | sidebar | produtos/serviços/promoções | cards (título, preço, emoji/imagem, status) | vazio, draft, ativo | M |
| S08 | Detalhe da oferta | clicar card | descrição, preço, ICPs vinculados | form, multiselect de ICP (primeiro = principal) | — | M |
| S09 | Concorrentes | sidebar / agente | quem disputa o mesmo cliente | lista (nome, domínio, motivo, confiança), botão atualizar (custa crédito) | cache, atualizando | M |
| S10 | Anúncios de concorrentes | de S09 ou busca por nicho | ver quem anuncia e o quê | modo "discover" agrupado por anunciante (miniaturas, nº de anúncios) → "scrape" de um anunciante; custo estimado antes | sem resultados, custo alto | M |
| S11 | Tendências sociais | agente / nicho | o que está funcionando agora | ganchos, ângulos/temas, formatos; janela de dias; plataformas | preflight de custo no modo profundo | M |
| S12 | Desempenho próprio | analytics | top posts, melhor horário, métricas diárias | tabela de posts com métricas, heatmap de horário | conta não conectada, sem dados | M |
| S13 | Próximos passos (Autopilot) | home / Tasks | cards de ação com "por quê" | kanban Proposto / Em andamento / Feito; aprovar, rejeitar (motivo), discutir | vazio | A |
| S14 | Chat do agente | sempre visível | pedir em linguagem natural | chat, cards de resultado inline | — | A |
| S15 | Criar criativo | agente ou botão "Create" | formato, brief, oferta, ICP, posicionamento, quantidade | seletor de formato (imagem, carrossel, ...), placement (feed 4:5, story 9:16, LinkedIn 1:1...), estimativa de crédito | sem saldo, onboarding não pronto | A/M |
| S16 | Progresso da geração | após S15 | card que se atualiza | barra/estado: fila, rodando, pronto, falhou (crédito devolvido) | falha | M |
| S17 | Galeria de criativos | sidebar | todos os criativos da marca | grid, filtros (plataforma, status, tipo, favoritos, só versão atual) | vazio | M |
| S18 | Detalhe do criativo | clicar item | ver, editar falando, versões | prévia no feed/story/reels, campo "o que mudar", histórico v1/v2 com slider antes/depois, veredito de marca | logo errado (< 60), não checado | A |
| S19 | Score do anúncio | ferramenta pública | nota 0–100 + o que funciona/o que corrigir | upload, faixa (top/forte/médio/abaixo), lista de pontos | sem upload, falha só do texto | A |
| S20 | Blitz | "Publish & grow" | uma semana de posts em deck | cards arrastáveis, Aprovar/Pular | deck acabou | A |
| S21 | Calendário de conteúdo | sidebar Posts | posts aprovados/rascunhos por slot | grade semanal por hora, preview por canal | semana vazia | A |
| S22 | Trocar workspace (cliente) | header | multi-cliente | switcher, convidar membro/cliente | — | A |
| S23 | Inspiração (Discover / For You) | criar | presets de estilo/layout para remixar | grid ranqueado com prévias | — | M |
| S24 | Linhagem do criativo | de S06 ou S18 | de onde veio, o que foi feito por público | árvore/lista com origem e "crenças" | — | M |

**24 telas.**

## 4. Fluxos

```
F01 Cadastrar cliente e entender o negócio
    S01 colar URL/@ -> S02 progresso -> S03 brand DNA (corrigir) -> S04 resumo
    edge: site fora do ar, Instagram privado, sem logo, cliente sem site (só IG), nicho mal inferido
    happy path: ~3 cliques + espera

F02 Definir público e oferta
    S05 ICPs gerados -> S06 ajustar dores/objetivos -> S07 ofertas -> S08 vincular oferta a ICP
    edge: ofertas duplicadas, serviço sem preço, várias personas para uma oferta
    happy path: ~5 cliques

F03 Mapear concorrência
    S09 lista (cache grátis) -> [atualizar, custa] -> S10 discover por nicho/país (BR) -> escolher anunciante -> scrape
    edge: nicho local sem anunciantes, custo acima do esperado, anunciante sem anúncios ativos
    happy path: ~4 cliques + confirmação de custo

F04 Ler tendências
    S11 nicho + plataformas + janela -> ganchos / ângulos / formatos
    edge: nicho pequeno demais (amostra vazia), modo profundo pede confirmação de custo

F05 Receber próximos passos
    S13 cards com título, por quê, impacto -> aprovar / rejeitar (motivo) / discutir no S14
    edge: nada a sugerir, card desatualizado

F06 Gerar conteúdo/anúncio fundamentado  [CORE]
    S15 formato + brief + oferta + ICP + placement + qtd -> estimativa de custo -> S16 -> S17/S18
    edge: sem saldo, onboarding incompleto (bloqueia ou "rascunho fora da marca"), geração falhou
    happy path: ~4 cliques. Número a bater.

F07 Revisar e editar falando
    S18 escrever "tira o telefone" -> nova versão (anterior mantida) -> comparar -> veredito de marca / S19 score
    edge: logo inventado (confiança < 60) -> edição cirúrgica com o logo real como referência

F08 Aprovar para o calendário
    S20 swipe direita = aprova no melhor horário, esquerda = gera outro -> S21 calendário
    edge: sem horário histórico (conta nova), semana cheia
```

**8 fluxos.**

## 5. Componentes

| componente | variantes | estados | telas |
| --- | --- | --- | --- |
| Botão | primário, secundário, ghost, destrutivo | normal, loading, desabilitado | todas |
| Input URL | — | vazio, validando, erro | S01 |
| Stepper de progresso | vertical com etapas | pendente, rodando, ok, erro | S02, S16 |
| Swatch de cor / chip de fonte | editável | normal, editando | S03 |
| Campo editável inline | texto, lista | ler, editar, salvo | S03, S06, S08 |
| Card de entidade | ICP, oferta, concorrente, anunciante, criativo | normal, selecionado, draft | S05, S07, S09, S10, S17 |
| Multiselect / picker | ICP, oferta, formato, placement | — | S08, S15 |
| Upload (dropzone) | doc, imagem | vazio, arrastando, enviando, erro | S04, S19 |
| Badge de custo | créditos / US$ | ok, sem saldo | S10, S11, S15 |
| Card de progresso vivo | — | fila, rodando, pronto, falhou | S16, S14 |
| Grid de mídia | com filtros | vazio, carregando | S17, S23 |
| Prévia por placement | feed, story, reels, LinkedIn | — | S18, S21 |
| Slider antes/depois | — | — | S18 |
| Histórico de versões | lista v1…vn | atual marcado | S18 |
| Medidor de score | 0–100 com faixa | — | S18, S19 |
| Lista "funciona / corrigir" | — | — | S19 |
| Card de proposta | com por quê + impacto | proposto, em andamento, feito, rejeitado | S13 |
| Kanban | 3 colunas | coluna vazia | S13 |
| Deck de swipe | — | arrastando, último card | S20 |
| Calendário semanal | grade dia × hora | slot vazio, ocupado | S21 |
| Chat | mensagens + cards inline | digitando, erro | S14 |
| Switcher de workspace | — | — | S22 |
| Toast | sucesso, erro, info | — | todas |
| Modal de confirmação de custo | — | — | S10, S11 |

## 6. Modelo de dados inferido

```
Workspace  id, nome, slug, websiteUrl, instagramUrl, tipoNegocio, nicho, pais, idioma
           evidence: tools list_vibiz / create_from_url / onboarding_status; página agências
           confidence: high

BrandKit   workspace_id, logoUrl, cores[], fontes[], tom, publicoAlvo, nomeEmpresa, headline
           evidence: get_branding, brand kit no help center, home "Brand DNA"
           confidence: high

OnboardingStage  workspace_id, etapa (workspace|brand_kit|niche|catalog|summary), status, mensagem
           evidence: onboarding_status
           confidence: medium

KnowledgeDoc  id, workspace_id, fileName, status, chunkCount   + KnowledgeChunk(doc_id, content)
              + resumoNegocio (texto)
           evidence: get_knowledge (busca full-text em passagens)
           confidence: high

ICP        id, workspace_id, nome, titulo, descricao, demografia{idade,genero,renda,local,escolaridade},
           dores[], objetivos[], canais[], landingSlug
           evidence: create_icp / get_icp
           confidence: high

Offer      id, workspace_id, titulo, descricao, precoCents, moeda, tipo (service|ecommerce|agency|software|generic),
           emoji, imageUrl, status (draft|active), origem
           evidence: create_offer / generate_offers / list_offers
           confidence: high

OfferICP   offer_id, icp_id, primario (bool — o primeiro vinculado)
           evidence: link_offer_icp / list_offer_icp_links
           confidence: high

CompetitorResearch  id, workspace_id, criadoEm, hint, paises[]
Competitor  research_id, nome, dominio, motivo, confianca
           evidence: find_competitors (cache vs refresh)
           confidence: high

CompetitorAd  id, query, pais, pageId, pageName, titulo, corpo, cta, linkUrl, imageUrl, coletadoEm
           evidence: search_competitor_ads (discover/scrape)
           confidence: high

TrendReport  id, workspace_id, nicho, plataformas[], dias, modo, ganchos[], angulos[], formatos[]
           evidence: social_trends
           confidence: medium (formato exato da saída não documentado)

PostMetric  post_id, plataforma, url, legenda, data, impressoes, alcance, curtidas, comentarios,
            compartilhamentos, salvos, cliques, views, taxaEngajamento
           evidence: analytics_top_posts
           confidence: high

Objective  workspace_id, objetivo (vazio = geral)
           evidence: list_objectives
           confidence: medium

Proposal   id, workspace_id, titulo, descricao, motivo, impacto, area (ads|social|offers|content|research|...),
           status (pending|approved|rejected|discussing|executed|dismissed), motivoRejeicao, diaPlano (1..3)
           evidence: create_proposal / update_proposal, home "Autopilot"
           confidence: high

Creative   id, workspace_id, formato (image|carousel|...), plataforma/placement, aspecto, estilo,
           brief, offer_id?, icp_id?, headline, status (draft|queued|processing|succeeded|failed), favorito
CreativeVersion  creative_id, n, mediaUrl, promptEdicao, criadoEm, atual (bool)
CarouselSlide    creative_id, ordem, tipo (hook|story|cta), headline, subheadline, objetivoEmocional, descricaoVisual
           evidence: generate_image / generate_carousel / creatives_edit / list_creatives; home "versões mantidas"
           confidence: high

QualityVerdict  creative_id, julgado (bool), score, confiancaLogo, motivo, instrucaoEdicao
           evidence: creative_quality
           confidence: high

AdScore    id, imagemUrl, score (percentil), faixa, pontosFortes[], aCorrigir[]
           evidence: página /trend
           confidence: high

Lineage    creative_id -> origem (referência, trend, concorrente, oferta, icp), "crenças"
           evidence: creative_lineage
           confidence: medium

PostDraft  id, workspace_id, plataforma, legenda, mediaUrls[], slotAgendado, status (draft|scheduled)
           evidence: draft_post, Blitz, calendário
           confidence: high

Memory / OrgSkill  workspace_id, chave, valor | nome, tipo (workflow|goal|lesson), corpoMd
           evidence: memory_remember / save_org_skill
           confidence: medium

CreditLedger  workspace_id, saldo, movimento, motivo
           evidence: termos §4, pricing
           confidence: medium (no clone pode virar só um contador de custo de API)
```

## 7. Matriz de funcionalidades

Ver `replica/features.csv`.

## 8. O que não dá para clonar

- **Treviso (score de anúncio)**: modelo treinado nos dados deles. Dá para fazer uma rubrica própria + avaliação por modelo de visão, e calibrar com os resultados reais dos seus clientes ao longo do tempo. Detalhe útil que eles mesmos publicaram: o modelo irmão que tentava prever custo por conversão pela imagem quase empatou com chute — conversão depende de oferta, página e público, não do criativo sozinho.
- **Biblioteca "golden hooks"**: curadoria de vídeos deles. Substituir pela sua própria biblioteca de ganchos (você já tem Sexy Canvas e diagnósticos).
- **Corpus diário do Explore / galeria de clientes**: conteúdo de terceiros.
- **Templates de estilo do Discover / 110 receitas do Product Studio**: são assets deles. Criar os seus.
- **Dados do Meta Ad Library**: a API oficial do Meta só cobre anúncios comerciais da UE (fora isso, temas sociais/políticos). No Brasil, a alternativa é scraper (eles usam Apify) — você tem o conector Apify, mas scraping da Ad Library tem risco perante os termos da Meta. Avaliar.
- **Rede/escala**: "488 mil peças geradas", benchmarks agregados entre clientes.

## 9. Tamanho

- Telas: 24 · Fluxos: 8 · Entidades: ~18
- Partes difíceis:
  1. **Ler o negócio a partir de URL/Instagram** (extração de logo, paleta, fontes, tom, serviços) com qualidade — scraping do site do cliente + modelo de visão + revisão manual.
  2. **Criativo na marca de verdade** — geração de imagem que não invente o logo. O próprio Vibiz contorna compondo o logo real por cima da foto; fazer igual.
  3. **Dados de concorrência e tendências no Brasil** — Ad Library e Instagram/TikTok via Apify, com custo por chamada e risco de termos.
  4. Analytics de posts próprios: Instagram Graph API exige conta Business/Creator e app Meta aprovado (ou puxar via Windsor.ai, que você já usa).
- Tamanho: **M (algumas semanas)** para a fatia, usando APIs de LLM e geração de imagem. Vira L se entrar score treinado ou publicação automática.
