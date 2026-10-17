# Deploy — Tal Qual

Objetivo agora: **prévia privada num link** (Vercel + Supabase), só para uso seu. Sem domínio próprio, sem venda.

## Preflight (17/10/2026)

| checagem | resultado | trava? |
| --- | --- | --- |
| Testes ponta a ponta (`npm run e2e`) | 60/60 passando (uma corrida no teste de favoritos foi corrigida no próprio teste) | não |
| Build de produção (`next build`) | passa | não |
| Bugs S1/S2 abertos | 0 (`bugs.md`) | não |
| Varredura de restos do original | limpa: 0 ocorrências de vibiz/treviso/blitz/autopilot | não |
| Nome, títulos, favicon | Tal Qual; ícone "TQ" provisório; **sem imagem de compartilhamento (OG)** | não para prévia |
| Apagar conta | funciona (teste A05) | não |
| Obrigatórios da matriz | **11 de 29** (`parity.md`) | **sim, para lançamento público** |
| Política de privacidade e termos | **não existem** | **sim, para lançamento público** |
| Banner de cookies | não precisa (só cookie de login) | não |
| Migrações no Supabase de verdade | **nunca rodaram fora do simulador.** O build da Vercel roda as migrações e o `check:supabase --fix` primeiro; se algo falhar, o deploy para e o log mostra onde | risco conhecido |

**Veredito:** não está pronto para lançamento público (faltam obrigatórios e páginas legais). **Para prévia privada, pode ir**, com o cadastro trancado no seu e-mail (`SIGNUP_ALLOWLIST`): ninguém mais consegue criar conta.

## Ajustes feitos para rodar na Vercel

- **Jobs que não morrem:** na Vercel, a função congela quando a resposta sai, e a geração de arte ficaria parada em "gerando". Agora cada job é registrado com `after()` do Next, que mantém a função viva até terminar.
- **Fontes da arte no pacote:** a composição lê as fontes do disco; `outputFileTracingIncludes` faz a Vercel levar esses arquivos.
- **Migrações pelo deploy, não à mão:** script `vercel-build` = migrações → checagem do Supabase (cria o bucket privado se faltar) → build. Se a checagem falhar, o deploy não sai.

## Passo a passo (contas e chaves são suas: eu não crio conta nem cola chave)

1. **Supabase:** crie um projeto novo só para isso, região São Paulo (sa-east-1). Guarde a senha do banco.
2. **GitHub:** crie um repositório **privado e vazio** chamado `tal-qual` e me mande o nome (`seu-usuario/tal-qual`). Eu envio o código para ele.
3. **Vercel:** entre com o GitHub → Add New → Project → importe `tal-qual`.
   - **Root Directory:** `app`
   - **Environment Variables:** cole os valores direto na Vercel, nunca no chat:

| variável | de onde vem |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://tal-qual.vercel.app` (ou o endereço que a Vercel mostrar) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | mesma tela → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | mesma tela → service_role (secreta) |
| `DATABASE_URL` | Supabase → Connect → Transaction pooler (porta 6543), com a sua senha |
| `DIRECT_URL` | Supabase → Connect → Session pooler (porta 5432), com a sua senha |
| `STORAGE_DRIVER` | `supabase` |
| `STORAGE_BUCKET` | `files` |
| `SIGNUP_ALLOWLIST` | o seu e-mail |

   - Clique em **Deploy**.
4. **De volta ao Supabase:** Authentication → URL Configuration
   - Site URL: o endereço da Vercel
   - Redirect URLs: `https://<seu-endereço>/auth/callback`
   - (Opcional) Authentication → Emails: cole os modelos em português de `app/supabase/templates/`.
5. **Abra o link → Criar conta** com o seu e-mail → confirme pelo e-mail → pronto.

## Depois de no ar

- [ ] Fazer o fluxo inteiro no link: cliente → marca → oferta → persona → gerar 2 artes → baixar PNG
- [ ] Repetir no celular
- [ ] Logs: Vercel → Project → Logs (erros de geração aparecem como `[generate …]`)
- [ ] Na primeira semana, conferir o uso do plano grátis no Supabase (banco e armazenamento)

URL ao vivo: _(preencher depois do primeiro deploy)_
