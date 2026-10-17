# Backend — login e banco de dados

Atualizado em 17/10/2026. App em `replica/app`.

## O que foi feito

- **Banco:** Postgres do Supabase, com migrações versionadas em `app/supabase/migrations/` (`0001_init.sql`, `0002_json_shapes.sql`). Elas rodam com `npm run db:migrate`, cada uma numa transação e uma vez só.
- **Acesso:** Row Level Security em **todas** as 33 tabelas. O app fala com o banco pelo servidor (`DATABASE_URL`). A cada requisição ele assume o papel `authenticated`, com o id do usuário em `request.jwt.claims`, igual ao Supabase, então quem decide o que cada um vê é o banco, não o código. Os jobs usam acesso de serviço e sempre filtram pelo `workspace_id` que a action já validou.
- **Login (Supabase Auth via `@supabase/ssr`):**
  - cadastro com confirmação por e-mail;
  - entrar com senha ou com link mágico;
  - esqueci a senha → link → nova senha;
  - trocar senha;
  - sair deste aparelho / sair de todos;
  - apagar conta de verdade: agência, clientes, criativos, arquivos e o próprio login.
  - A sessão fica em cookies http-only, com fluxo PKCE, e o middleware renova o token e protege tudo menos as telas de login.
- **Agência:** criada no primeiro acesso, com o usuário como dono. Papéis `owner`, `admin` e `member`. Só o dono altera o teto de gasto; membro comum lê.
- **Arquivos:** bucket privado no Supabase Storage (`STORAGE_DRIVER=supabase`). Saem só pela rota `/api/files`, que confere se o cliente do caminho é da sua agência. Sem login, ou de outra agência, a resposta é 404.
- **E-mails:** modelos em português em `app/supabase/templates/` (confirmar cadastro, link mágico, redefinir senha).
- **Limite de tentativas:** guardado no banco, então vale para várias instâncias do app. Os limites são: entrar, 8 por e-mail e 20 por IP a cada 10 minutos; e-mails, 3 por endereço e 10 por IP por hora; cadastro, 5 por IP por hora.
- **Dados de exemplo:** `npm run seed` cria um usuário de teste e dois negócios fictícios. Não roda em produção e não usa dados reais.
- **Pagamento:** não tem. A arquitetura definiu uso interno, sem cobrança. O controle de gasto com APIs é pelo teto mensal da agência (`orgs.monthly_cost_cap_cents`).

## Como ligar no seu Supabase (você faz; eu não crio conta nem digito chave)

1. **Crie o projeto** em supabase.com: região **South America (São Paulo)** e uma senha forte para o banco.
2. **Copie `app/.env.example` para `app/.env.local`** e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`: em Project Settings → API.
   - `DATABASE_URL`: em Connect → *Transaction pooler* (porta 6543).
   - `DIRECT_URL`: em Connect → *Direct connection* (porta 5432) ou *Session pooler*.
   - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` agora; o domínio de verdade no deploy.
   - `STORAGE_DRIVER=supabase`.
3. **Aplique as migrações:** `npm run db:migrate`.
4. **Configure o Auth** em Authentication:
   - **Sign In / Providers → Email:** "Confirm email" **ligado**.
   - **URL Configuration:** *Site URL* = `NEXT_PUBLIC_SITE_URL`. Em *Redirect URLs*, adicione `http://localhost:3000/auth/callback` e, no deploy, `https://seu-dominio/auth/callback`.
   - **Emails → Templates:** cole o conteúdo de `confirmation.html`, `magiclink.html` e `recovery.html`. O assunto sugerido está no comentário de cada arquivo.
   - **Emails → SMTP:** ligue o SMTP próprio (Resend) antes de usar de verdade. O SMTP padrão do Supabase manda poucos e-mails por hora e é só para teste.
5. **Desligue a Data API**, porque o app não usa: Project Settings → API → desmarque o schema `public` em *Exposed schemas* (ou desligue a Data API). Com isso a chave pública não chega nas tabelas nem por engano. As permissões do papel `anon` já estão revogadas na migração; isto é uma segunda trava.
6. **Crie o bucket e confira tudo:** `npm run check:supabase -- --fix`. O script cria o bucket privado `files` (até 10 MB, só imagens) e testa banco, RLS, policies, Auth, service role e gravação no bucket.
7. **Crie sua conta** em `/criar-conta` e confirme pelo e-mail. Depois, para ninguém mais se cadastrar, use **uma** destas opções:
   - preencha `SIGNUP_ALLOWLIST` (por exemplo, o seu e-mail ou `@suaagencia.com.br`);
   - ou desligue "Allow new users to sign up" no painel.
8. **Backups:** confira em Database → Backups. O plano Free não tem backup diário automático; no Pro ele vem ligado. Até lá, faça um `pg_dump` semanal pelo `DIRECT_URL`.

## Login com Google (opcional)

O código já usa o fluxo PKCE do Supabase; falta só a configuração, que é sua:
1. No Google Cloud, crie um OAuth Client do tipo *Web application*, com o redirect `https://<seu-projeto>.supabase.co/auth/v1/callback`.
2. No Supabase, em Authentication → Providers → Google, cole o Client ID e o Secret.
3. Me peça para adicionar o botão "Entrar com Google". É um `signInWithOAuth` com a mesma rota `/auth/callback`.

Escopos mínimos: `openid email profile`. Esses escopos **não** exigem a verificação demorada do Google (ela só vale para escopos sensíveis, como Calendar e Drive). A tela de consentimento só precisa estar em "Em produção" antes de abrir para gente de fora.

## Como foi testado (e o que não foi)

Este ambiente não baixa o servidor do Supabase: Docker Hub, ECR e os releases do GitHub estão bloqueados. Então:
- **Banco: real.** Postgres 16 local com o mínimo do Supabase (`dev/local-supabase/shim.sql`: papéis `anon`, `authenticated`, `service_role` e `auth.uid()`), com as mesmas migrações que vão para o seu projeto.
- **Login: com simulador.** `dev/local-supabase/auth-emulator.mjs` fala o mesmo HTTP do Supabase Auth: cadastro, senha, link mágico, recuperação, PKCE, refresh, logout global e admin. O app usa a biblioteca oficial e não sabe que é um simulador. **O comportamento do Auth real precisa ser confirmado no seu projeto**, e o `check:supabase` faz a parte automática disso.
- **Storage: não testado aqui.** Não existe servidor local de Storage. O driver `supabase` usa a API oficial (`@supabase/supabase-js`); o `check:supabase` grava e apaga um arquivo de teste no seu bucket.

Para rodar o ambiente local: `npm run local:up`, depois `npm run seed` e `npm run dev`.

**Testes que passaram:**

| teste | resultado |
| --- | --- |
| Cadastro → e-mail → confirmar → entrar; bloqueio sem confirmar | ok |
| Senha errada recusada; volta para a página pedida (`next`); `//site-externo` bloqueado | ok |
| Link mágico entra uma vez; o mesmo link de novo é recusado; e-mail inexistente recebe a mesma resposta | ok |
| Esqueci a senha → nova senha; a senha antiga para de valer | ok |
| Sair de todos os aparelhos derruba a outra sessão | ok |
| Limite: na 9ª tentativa errada, bloqueia (nem a senha certa passa até a janela acabar) | ok |
| Fluxo principal no banco: novo cliente, marca, logo, persona, oferta, 2 artes, baixar PNG, favorito | ok |
| **Segundo usuário:** 0 clientes; páginas, criativos e arquivos do primeiro → 404; mesmo slug em agências diferentes sem colisão | ok |
| **No SQL** (`dev/local-supabase/rls-test.sql`): intruso vê 0 linhas nas 33 tabelas; insert recusado; update não altera nada; membro não muda o teto; `anon` sem acesso | ok |
| Apagar conta: dados e login somem; a outra agência fica intacta | ok |
| axe WCAG 2.2 AA nas telas de login e conta (2 temas × 390/1440 px): 24 checagens, 0 problemas | ok |
| `next build` de produção; nenhum segredo no bundle do navegador | ok |

**Bugs que os testes pegaram e foram corrigidos:**
- Cores e dados demográficos estavam sendo gravados como texto dentro do JSON, porque o driver já serializa `jsonb` e eu serializava de novo. Foi corrigido, e a migração `0002` conserta o que já tinha sido gravado e agora o banco recusa esse formato.
- A tabela temporária do teste de RLS foi barrada pelo próprio RLS. Foi um ajuste no teste, mas confirmou que a regra vale até para objetos do dono.

## Checklist de segurança

- [x] Segredos só em variáveis de ambiente; `.env*` no `.gitignore` (menos o `.env.example`); nenhum segredo no bundle do navegador (verificado no build).
- [x] Toda entrada validada no servidor com Zod (actions de dados e de login).
- [x] Autorização em toda leitura e escrita pelo RLS, testada com um segundo usuário na tela e no SQL.
- [x] Limite de tentativas em entrar, cadastrar e em tudo que manda e-mail.
- [ ] Webhooks com assinatura: **não se aplica ainda** (sem Stripe; o webhook do Apify entra no M2 e vai verificar o segredo).
- [x] Uploads: tipo e tamanho limitados (10 MB, PNG/JPG/WebP/SVG); SVG convertido para PNG na entrada; bucket privado; servidos com CSP `sandbox` e `nosniff` por rota que checa a agência. *Parcial:* saem do mesmo domínio do app (pela rota autenticada), não de um domínio separado.
- [x] Sem dado de usuário em URL ou log: chaves de limite usam hash do e-mail; erros técnicos vão para o log do servidor, e a tela mostra mensagem genérica.
- [ ] Dependências auditadas: `npm audit` mostra **1 alta e 2 moderadas, todas do `postcss` embutido no Next 15**. Ele só processa o nosso próprio CSS no build, nunca entrada de usuário. A correção é o Next 16 (versão nova grande; também libera o TypeScript 7). Faça a troca antes do deploy público. O `satori` já foi atualizado e a falha dele foi resolvida.
- [ ] Política de privacidade com todos os processadores: **pendente** (Supabase, Vercel e, quando entrarem, Resend, Anthropic e o provedor de imagem). Precisa existir antes de alguém de fora usar.

## Próximos passos de backend (fora deste pedido)

Ligar o Claude (copy), o provedor de imagem e o Apify (leitura do site e da concorrência) nos pontos de troca de `lib/jobs/providers.ts`, e mover os jobs para o Trigger.dev, com retry e chave de idempotência.
