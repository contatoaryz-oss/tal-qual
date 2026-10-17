# Arquitetura — clone interno (análise do negócio → conteúdo e anúncios)

Base: `replica/recon.md` (24 telas S01–S24, 8 fluxos F01–F08) e `replica/features.csv`.
Schema: `replica/schema.sql` (migração 0001, 33 tabelas). Testado em Postgres 16 com um stub do `auth` do Supabase: aplica sem erro, RLS isola clientes e as constraints abaixo disparam.

Uso: interno, uma agência (você) com vários clientes. Sem cobrança, sem app mobile, sem publicação automática.

---

## 1. Stack

| camada | escolha | por quê |
| --- | --- | --- |
| web app | Next.js (App Router) + TypeScript | server actions resolvem 90% das rotas sem montar API à parte; deploy trivial na Vercel |
| estilo | Tailwind com tokens do `/replica-design` | tema próprio por cima, sem herdar nada do original |
| mobile | nenhum (web responsivo) | você aprova no celular pelo navegador; app nativo não paga o custo agora |
| banco | Postgres no Supabase | um banco só, com RLS, storage e realtime no mesmo lugar |
| acesso a dados | `supabase-js` com tipos gerados + SQL nas migrações | o RLS faz a autorização; ORM em cima de RLS só duplica regra |
| auth | Supabase Auth (link mágico por e-mail + Google) | convidar cliente aprovador é um e-mail, sem senha |
| pagamentos | nenhum | uso interno; custo de API controlado pela tabela `api_costs` |
| e-mail | e-mails do próprio Supabase Auth | só convite e login; Resend entra se um dia mandar relatório |
| jobs | Trigger.dev | jobs longos (scraping, geração), retry, idempotency key e agendamento num lugar só |
| arquivos | Supabase Storage (buckets privados, URL assinada) | logo, fotos, PDFs, criativos; regra de acesso igual à do banco |
| tempo real | Supabase Realtime em `onboarding_stages`, `creatives`, `research_runs` | os cards de progresso (S02, S16) se atualizam sem polling |
| hospedagem | Vercel | preview por branch, cron não necessário (agenda fica no Trigger.dev) |
| LLM | Claude API: modelo médio para análise e copy, modelo pequeno para classificar/etiquetar | análise de marca, ICP, oferta, Sexy Canvas e copy em pt-BR |
| geração de imagem | um provedor com edição por referência, atrás de uma interface `ImageProvider` | trocar de provedor sem mexer no resto; a escolha é feita por custo e qualidade no M1 |
| texto e logo na arte | Satori + sharp (render determinístico no servidor) | IA erra texto e inventa logo; headline, CTA e logo real são compostos por código por cima da imagem |
| scraping do cliente | Apify (Website Content Crawler + scraper de Instagram) | você já usa; um provedor só para site, IG e Ad Library |
| anúncios de concorrentes | Apify (actor de Meta Ad Library) | a API oficial da Meta não cobre anúncios comerciais no Brasil — ver riscos |
| métricas próprias | Windsor.ai (API) | você já conecta as contas dos clientes lá; evita aprovar app na Meta |
| embeddings (opcional) | provedor com vetor de 1024 dimensões + pgvector | busca semântica na base de conhecimento; começa só com full-text em português |

Um repositório, um banco, um worker (Trigger.dev). Nada de microsserviço.

---

## 2. Schema

Arquivo: `replica/schema.sql`. Resumo por área:

| área | tabelas |
| --- | --- |
| tenancy | `orgs`, `org_members`, `workspaces`, `workspace_members` |
| marca e onboarding | `onboarding_stages`, `brand_kits`, `brand_assets` |
| conhecimento | `knowledge_docs`, `knowledge_chunks` |
| público e oferta | `icps`, `offers`, `offer_icps`, `objectives` |
| pesquisa | `research_runs`, `competitors`, `competitor_ads`, `trend_items` |
| **diferencial** | `archetype_diagnoses`, `territory_scores` |
| desempenho | `social_accounts`, `post_metrics` |
| estratégia | `proposals` |
| criação | `creatives`, `creative_versions`, `carousel_slides`, `creative_sources`, `quality_checks` |
| calendário | `post_drafts` |
| agente e operação | `agent_messages`, `workspace_memories`, `api_costs`, `inspiration_presets`, `hooks` |

**Regras aplicadas em todas as tabelas:** `id uuid` com `gen_random_uuid()`, `created_at`/`updated_at` em `timestamptz` (UTC), trigger de `updated_at`, `workspace_id` ou `org_id` como dono, índice em toda FK e coluna filtrada, `check` em todo status, dinheiro em centavos + moeda.

**`on delete` decidido, não padrão:**
- Apagar workspace (cliente) → `cascade` em tudo dele. É o caminho da exclusão LGPD.
- Apagar oferta ou ICP → `set null` nos criativos. O criativo continua existindo, só perde o vínculo.
- Apagar usuário → `set null` em `created_by`/`approved_by`. O histórico do trabalho fica.
- Apagar research run → `set null` em concorrentes e anúncios, `cascade` em `trend_items`. Tendência sem a coleta de origem não tem valor.

**Acesso: Row Level Security no Postgres.**
- Membro da org (você e sua equipe) lê e escreve em todos os workspaces da org.
- `workspace_members.role = 'approver'` (o cliente) só lê. A aprovação passa pela server action `approveDraft`, que roda com a service role e muda **só** o status do post.
- Os jobs usam a service role, que ignora o RLS. Por isso, todo job recebe `workspace_id` e filtra por ele no código. A regra vale para toda função em `/jobs`.
- Testado: usuário de outra org vê 0 linhas e não consegue inserir; aprovador lê mas não escreve.

**Restrições que são problema de banco, não de tela:**
| problema | solução no schema |
| --- | --- |
| dois posts aprovados no mesmo slot e canal | `unique index one_post_per_slot` parcial em status aprovado/agendado |
| duas edições simultâneas gerando "v2" duas vezes | `unique (creative_id, version)` + incremento numa transação (`select ... for update` em `creatives`) |
| webhook do Apify chegando duas vezes | `unique (provider, provider_run_id)` em `research_runs` |
| mesmo job cobrando custo duas vezes | `api_costs.idempotency_key unique` |
| mesma sugestão aparecendo de novo enquanto pendente | `unique (workspace_id, dedupe_key)` parcial em `proposals` |
| oferta com dois ICPs "principais" | `unique index` parcial em `offer_icps where is_primary` |
| rejeitar proposta sem dizer por quê | `check reject_needs_reason` |
| re-scrape apagar correção manual da marca | `brand_kits.edited_fields`: o job pula esses campos |
| dois arquétipos "atuais" | `unique index` parcial `where is_current` |

**Diferencial no modelo de dados.** `archetype_diagnoses` e `territory_scores` aplicam a regra do seu método: o arquétipo entra **depois** da pesquisa, como veto sobre os territórios emocionais. A geração (F06) só usa territórios com `archetype_verdict = 'allowed'`. A lista das 14 sensações no `check` é um placeholder: ajuste para os nomes exatos da sua skill `sexy-canvas` antes de rodar a migração.

---

## 3. API

Padrão: **server actions** para tudo que a tela chama, **route handlers** só para streaming do agente e webhooks. Toda action valida a entrada com Zod, roda com a sessão do usuário (RLS) e enfileira job quando o trabalho passa de ~5 s.

"Quem": `org` = membro da agência · `approver` = cliente convidado · `job` = worker com service role.

### F01 — Cadastrar cliente e entender o negócio (S01–S04, S22)
| método / nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| action `createWorkspace` | cria o workspace e as 7 etapas `pending`, dispara `onboard-workspace` | org | `{name?, websiteUrl?, instagramHandle?, niche?}` | `{workspaceId}` |
| action `rescrapeWorkspace` | refaz a leitura, respeitando `edited_fields` | org | `{workspaceId}` | `{jobId}` |
| action `updateBrandKit` | edição inline de um campo; marca o campo em `edited_fields` | org | `{workspaceId, field, value}` | `brandKit` |
| action `uploadLogo` | substitui o logo pelo arquivo real (PNG/SVG) | org | `FormData` | `{logoPath}` |
| action `uploadKnowledgeDoc` | envia PDF, cria o doc, dispara `ingest-doc` | org | `FormData` | `{docId}` |
| action `searchKnowledge` | busca full-text em português (+ vetor se ativado) | org, approver | `{workspaceId, query, limit}` | `chunks[]` |
| action `regenerateSummary` | refaz o resumo do negócio | org | `{workspaceId}` | `{jobId}` |
| action `archiveWorkspace` / `deleteWorkspace` | arquiva ou apaga tudo (LGPD) + limpa o storage | org (owner) | `{workspaceId}` | `ok` |
| action `inviteApprover` | convida o cliente por e-mail | org | `{workspaceId, email}` | `ok` |
| realtime `onboarding_stages` | progresso do S02 | org | — | eventos |

### F02 — Público e oferta (S05–S08)
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `generateIcps` | gera de 2 a 4 personas a partir do resumo, das falas do site e dos posts | org | `{workspaceId, count}` | `{jobId}` |
| `createIcp` / `updateIcp` / `deleteIcp` | CRUD manual | org | campos do ICP | `icp` |
| `generateOffers` | extrai serviços e pacotes do site | org | `{workspaceId}` | `{jobId}` |
| `createOffer` / `updateOffer` / `deleteOffer` | CRUD | org | campos da oferta | `offer` |
| `linkOfferIcp` / `unlinkOfferIcp` | vínculo; o primeiro vira principal | org | `{offerId, icpId}` | `ok` |
| `setObjective` | define a meta ativa do cliente | org | `{workspaceId, goal, metric?}` | `objective` |

### F03 + F04 — Concorrência e tendências (S09–S11)
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `estimateResearch` | cria `research_runs` em `awaiting_confirm` com o custo estimado | org | `{workspaceId, kind, params}` | `{runId, estimatedCostCents}` |
| `confirmResearch` | checa o teto mensal e dispara `run-research` | org | `{runId}` | `{status}` |
| `cancelResearch` | aborta o run no Apify e marca `cancelled` | org | `{runId}` | `ok` |
| `dismissCompetitor` | tira um concorrente da lista | org | `{competitorId}` | `ok` |
| `runTerritoryScoring` | pontua os anúncios coletados nas 14 sensações e aplica o veto do arquétipo | org | `{workspaceId, runId}` | `{jobId}` |
| `saveArchetypeDiagnosis` | grava o diagnóstico (do formulário da skill `arquetipico`) como o atual | org | diagnóstico | `diagnosis` |
| webhook `POST /api/webhooks/apify` | run do Apify terminou → `ingest-research` | Apify (assinatura) | payload Apify | `200` |

### S12 — Desempenho próprio
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `connectSocialAccount` | liga o perfil do cliente a uma conta já conectada no Windsor | org | `{workspaceId, platform, windsorAccountId}` | `account` |
| `syncMetricsNow` | força o sync do cliente | org | `{workspaceId}` | `{jobId}` |
| `importMetricsCsv` | alternativa sem Windsor | org | `FormData` | `{rows}` |
| leitura `getBestTimes` | heatmap dia × hora a partir de `post_metrics`, no fuso do workspace | org, approver | `{workspaceId, platform?}` | `slots[]` |

### F05 — Próximos passos (S13)
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `generateProposals` | lê o estado do workspace e cria até 6 cards com por quê e impacto | org | `{workspaceId}` | `{jobId}` |
| `updateProposalStatus` | aprovar, rejeitar (motivo obrigatório) ou discutir | org | `{proposalId, status, rejectReason?}` | `proposal` |
| `runProposal` | executa o `action` do card (ex.: gerar 3 criativos para o ICP X) | org | `{proposalId}` | `{jobId}` |

### F06 + F07 — Criar, editar e checar (S15–S19, S23, S24)
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `estimateCreative` | custo previsto + bloqueia se o onboarding não estiver pronto | org | `{workspaceId, format, count, placement}` | `{costCents, ready, blockers[]}` |
| `createCreatives` | cria N criativos `queued` com o mesmo `batch_id` e as fontes (trend, anúncio, território); dispara `generate-creative` | org | `{workspaceId, format, brief, offerId?, icpId?, placement, style?, count, sources[]}` | `{batchId, creativeIds[]}` |
| `composePhotoAd` | foto real + logo real + headline, sem IA na arte | org | `{workspaceId, assetId|photoUrl, headline, subhead?, placement}` | `creative` |
| `editCreative` | "o que mudar" → nova versão; a anterior fica | org | `{creativeId, instruction}` | `{jobId}` |
| `restoreVersion` | volta `current_version` para uma versão antiga | org | `{creativeId, version}` | `creative` |
| `judgeCreative` | veredito de marca (logo, cores, tom) + checagem do arquétipo | org | `{versionId}` | `{jobId}` |
| `scoreAd` | rubrica própria de anúncio (gancho, legibilidade, prova, CTA, foco) | org | `{versionId}` ou upload | `qualityCheck` |
| `toggleFavorite` / `deleteCreative` | — | org | `{creativeId}` | `ok` |
| leitura `getLineage` | de onde veio o criativo, ou tudo feito para um ICP | org, approver | `{creativeId}` ou `{icpId}` | árvore |

### F08 — Aprovar para o calendário (S20, S21)
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `buildBlitzDeck` | gera uma semana de posts (pilares + melhor horário) como `proposed` | org | `{workspaceId, weekStart, platforms[]}` | `{deckId}` |
| `swipeDraft` | direita = `approved` no slot; esquerda = `skipped` + gera substituto | org, approver | `{draftId, decision}` | `draft` |
| `approveDraft` | aprovação do cliente: só muda o status (service role, checa `workspace_members`) | approver | `{draftId}` | `draft` |
| `updateDraft` / `rescheduleDraft` | edita a legenda ou move o slot | org | `{draftId, ...}` | `draft` |
| `exportCalendar` | baixa a semana em CSV ou ICS e as artes num zip (você publica) | org | `{workspaceId, range}` | arquivo |

### Agente (S14)
| nome | o que faz | quem | entrada | saída |
| --- | --- | --- | --- | --- |
| `POST /api/agent/chat` | Claude com tool use; as ferramentas são as próprias actions acima, sempre no workspace ativo | org | `{workspaceId, threadId, message}` | stream SSE |

**Total: 48 rotas** (45 actions/leituras + 1 stream do agente + 1 webhook + 1 assinatura de realtime).

### Jobs (Trigger.dev)
| job | gatilho | o que faz |
| --- | --- | --- |
| `onboard-workspace` | `createWorkspace` | orquestra `scrape-site` → `extract-brand` → `infer-niche` → `generate-summary` → `generate-offers` → `generate-icps`; cada um atualiza a sua etapa |
| `scrape-site` | onboarding / re-scrape | Apify: páginas do site + perfil e últimos posts do IG; salva `knowledge_docs` (`site_page`) e `brand_assets` |
| `extract-brand` | após o scrape | logo (arquivo real), paleta, fontes, tom, provas; respeita `edited_fields` |
| `ingest-doc` | upload de PDF | extrai o texto, quebra em chunks, gera `tsv` (e embedding se ativado) |
| `run-research` | `confirmResearch` | inicia o actor no Apify com webhook de volta; não espera a resposta |
| `ingest-research` | webhook Apify | lê o dataset, faz upsert por `ad_archive_id` e grava o custo real |
| `analyze-competitor-ads` | após o ingest | etiqueta gancho, ângulo, formato e sensações em `competitor_ads.analysis` (modelo pequeno, em lote) |
| `synthesize-trends` | após o ingest de tendências | agrupa em `trend_items` (gancho, ângulo, formato) com links de evidência |
| `sync-metrics` | agenda diária 06h47 (America/Sao_Paulo) + manual | Windsor → `post_metrics` (upsert por `external_post_id`) |
| `weekly-proposals` | agenda segunda 07h38 (America/Sao_Paulo) | `generateProposals` para cada workspace `ready` |
| `generate-creative` | `createCreatives` / `runProposal` | monta o contexto (marca + ICP + oferta + território permitido + fonte) → copy com Claude → imagem → composição Satori com o logo real → `creative_versions` v1 → `judge-creative` |
| `edit-creative` | `editCreative` | edição por referência + recomposição; trava `creatives` para numerar a versão |
| `judge-creative` | após gerar ou editar | visão compara a arte com o logo e as cores; `logo_confidence < 60` → instrução de correção automática (no máximo 1 retry) |
| `build-blitz-deck` | `buildBlitzDeck` | escolhe os pilares, puxa os criativos aprovados ou gera, escreve uma legenda por canal |
| `cost-guard` | antes de todo job pago | soma `api_costs` do mês da org; acima do teto → recusa com mensagem clara |
| `storage-sweep` | diária 03h12 + após `deleteWorkspace` | remove arquivos sem linha no banco |

---

## 4. As partes que mordem

- **Fuso e horário de verão:** tudo é gravado em UTC, e a tela converte pelo `workspaces.timezone`. O Brasil não tem horário de verão hoje, mas um cliente em outro fuso (Floripa e Canoas são iguais; Portugal, não) precisa funcionar. O melhor horário é calculado no fuso do cliente.
- **Idempotência:** o Apify pode reenviar o webhook. O índice único em `provider_run_id` e o upsert por `ad_archive_id`/`external_post_id` resolvem. Todo job do Trigger.dev usa uma idempotency key do tipo `{tipo}:{entityId}:{versão}`.
- **Condições de corrida:** a edição de criativo numera a versão dentro de uma transação. Dois swipes no mesmo slot batem no índice único, e a tela mostra "slot ocupado, escolher outro".
- **Rate limit e custo:** a maior ameaça ao bolso. Toda pesquisa paga passa por estimar → confirmar. O `cost-guard` aplica o teto mensal da org. Lotes de imagem vão com no máximo 4 em paralelo por workspace. Claude roda com retry e backoff.
- **Texto dentro da imagem:** o gerador de imagem erra acentuação e ortografia em português. A regra é: a imagem sai **sem texto**, e headline, CTA e logo entram pelo Satori. Isso também resolve o logo inventado.
- **Tamanho de arquivo:** PDF de até 20 MB e logo/foto de até 10 MB, validados no cliente e no servidor. Criativos saem em WebP para a prévia e PNG para o download.
- **Busca:** `to_tsvector('portuguese', ...)` com índice GIN. Embeddings só se a busca por palavra não bastar.
- **Realtime:** inscrição só nas linhas do workspace ativo, com RLS aplicado ao canal. Ao reconectar, recarregar o estado do banco (o realtime não reenvia eventos perdidos).
- **Multi-tenancy:** RLS em todas as tabelas e `workspace_id` explícito em todo job da service role. Um teste automatizado tenta ler o cliente B logado como cliente A, e precisa dar 0 linhas.
- **LGPD:** `deleteWorkspace` apaga em cascata no banco e dispara o `storage-sweep`. Dados de concorrentes vêm da Ad Library, que é pública, mas ficam dentro do workspace e saem junto. Não guardar dados pessoais de quem comentou nos posts.
- **Termos de terceiros:** o scraping da Ad Library e do Instagram via Apify pode violar os termos da Meta. Mantenha volume baixo, uso interno e nunca reutilize a mídia de concorrente no criativo final (`competitor_ads.media_path` é só referência).
- **Cliente sem site:** muitos dos seus clientes só têm Instagram. O onboarding precisa funcionar a partir da bio, dos destaques, das legendas e das imagens. O schema já aceita `instagram_handle` sem `website_url`.
- **Windsor:** depende de cada conta de cliente estar conectada lá. Quando não está, a importação por CSV é o plano B.

---

## 5. Ordem de construção

### M0 — Fatia vertical (feia, de ponta a ponta)
Login → criar cliente por URL ou @ → marca extraída → 1 ICP + 1 oferta → gerar **1 imagem** com o logo real composto → ver na galeria.
- Telas: S01, S02, S03, S15 (mínima), S17
- Tabelas: `orgs`, `org_members`, `workspaces`, `onboarding_stages`, `brand_kits`, `icps`, `offers`, `creatives`, `creative_versions`, `api_costs`
- Rotas/jobs: `createWorkspace`, `updateBrandKit`, `uploadLogo`, `createIcp`, `createOffer`, `createCreatives`; jobs `onboard-workspace`, `scrape-site`, `extract-brand`, `generate-creative`, `cost-guard`
- Prova: Supabase + RLS + Trigger.dev + Claude + imagem + Satori funcionando juntos. Teste com a Massa Bruta.

### M1 — Must-haves de entendimento do negócio
- Telas: S04, S05, S06, S07, S08, S22
- Tabelas: `knowledge_docs`, `knowledge_chunks`, `offer_icps`, `brand_assets`
- Rotas: `generateIcps`, `generateOffers`, CRUD de ICP/oferta, `linkOfferIcp`, `uploadKnowledgeDoc`, `searchKnowledge`, `regenerateSummary`, `rescrapeWorkspace`
- Decide aqui o provedor de imagem (testar 2, comparar custo e qualidade em 10 artes).

### M2 — Must-haves de pesquisa + diferencial
- Telas: S09, S10, S11, S12
- Tabelas: `research_runs`, `competitors`, `competitor_ads`, `trend_items`, `social_accounts`, `post_metrics`, `archetype_diagnoses`, `territory_scores`
- Rotas: `estimateResearch`, `confirmResearch`, `cancelResearch`, webhook Apify, `connectSocialAccount`, `syncMetricsNow`, `saveArchetypeDiagnosis`, `runTerritoryScoring`; jobs `run-research`, `ingest-research`, `analyze-competitor-ads`, `synthesize-trends`, `sync-metrics`

### M3 — Must-haves de criação e calendário
- Telas: S15 (completa), S16, S18, S21
- Tabelas: `carousel_slides`, `creative_sources`, `post_drafts`
- Rotas: `createCreatives` com carrossel, copy por segmento e fontes; `editCreative`, `restoreVersion`, `updateDraft`, `rescheduleDraft`, `exportCalendar`; job `edit-creative`
- Fecha o core loop do recon: pesquisa → criativo fundamentado → editar falando → calendário.

### M4 — Should-haves
- Telas: S13, S19, S20, S14
- Tabelas: `proposals`, `quality_checks`, `objectives`, `agent_messages`
- Rotas: `generateProposals`, `updateProposalStatus`, `runProposal`, `judgeCreative`, `scoreAd`, `buildBlitzDeck`, `swipeDraft`, `setObjective`, `estimateCreative`, `composePhotoAd`, `/api/agent/chat`; jobs `judge-creative`, `build-blitz-deck`, `weekly-proposals`

### M5 — Could-haves
- Telas: S23, S24
- Tabelas: `inspiration_presets`, `hooks`, `workspace_memories`, `workspace_members`
- Rotas: `inviteApprover`, `approveDraft`, `getLineage`, `importMetricsCsv`; job `storage-sweep`
- Calibrar a rubrica do `scoreAd` com os resultados reais em `post_metrics`. É aqui que o clone começa a superar o original no que importa para você.

### M6 — Correções
O que o `/replica-entrepreneur` achar nas avaliações públicas da Vibiz, quando ele rodar.
