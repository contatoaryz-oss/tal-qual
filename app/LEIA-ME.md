# Tal Qual — como rodar no seu computador

O app tem duas partes: as telas e um servidor com banco de dados e login. Por isso ele não abre com dois cliques como um arquivo. Para rodar, ele precisa de um banco, e o caminho mais simples é o seu Supabase gratuito.

## Precisa ter

- **Node.js 20 ou mais novo:** https://nodejs.org (baixe a versão LTS)
- **Uma conta no Supabase:** https://supabase.com (o plano grátis basta)

## Passo a passo (uns 15 minutos na primeira vez)

1. **Crie um projeto no Supabase.** Anote a senha do banco que você escolher.
2. **Copie as chaves.** Na pasta `app`, duplique o arquivo `.env.example` e renomeie a cópia para `.env.local`. Preencha os campos; o `replica/backend.md` mostra onde achar cada um no painel do Supabase. Para rodar no seu computador, use:
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
   - `STORAGE_DRIVER=local` (as imagens ficam numa pasta do próprio computador)
3. **Abra o terminal na pasta `app`** e rode, um comando por vez:
   ```
   npm install
   npm run db:migrate
   npm run check:supabase -- --fix
   npm run seed
   npm run dev
   ```
   O `seed` cria dois clientes de exemplo e mostra no terminal o e-mail e a senha para entrar.
4. **Abra http://localhost:3000** e entre com esse e-mail e essa senha.

## Bom saber

- Por enquanto a arte sai em **modo de teste**: fundo abstrato nas cores da marca e texto de modelo pronto. A IA (Claude e o gerador de imagem) entra nos próximos blocos.
- O `.env.local` guarda as suas chaves. **Não mande para ninguém e não suba para o GitHub.** Ele já está fora do controle de versão.
- Se der erro em algum passo, copie a mensagem do terminal e me mande.
