# Bugs

Achados pelo `/replica-test` em 17/10/2026, no clone rodando local (build de produção + Postgres + simulador do Supabase Auth, dados do seed).
Só entra aqui o que foi reproduzido. Cada bug tem um teste em `app/e2e/` que falhava antes da correção e passa depois.

Gravidade: **S1** perda de dados, falha de segurança, pagamento errado, fluxo principal travado · **S2** recurso quebrado sem contorno · **S3** quebrado com contorno, ou visivelmente errado · **S4** cosmético.

Resumo: 0 S1 · 3 S2 · 4 S3 · 1 S4. **Todos corrigidos** no commit `6e62deb`.

| id | grav. | o quê | teste | status |
| --- | --- | --- | --- | --- |
| B01 | S2 | Sessão encerrada + enviar formulário → tela branca, o que foi digitado se perde | A04-E2 | ✅ `6e62deb` |
| B02 | S2 | Nenhuma tela de erro própria: qualquer falha vira página branca em inglês, sem saída | A04-E2, F01-E7, F01-N1 | ✅ `6e62deb` |
| B03 | S2 | Logo acima de 10 MB derruba a tela de Marca (erro 500) | F01-E7 | ✅ `6e62deb` |
| B04 | S3 | Sem internet ao enviar → tela branca | F01-N1 | ✅ `6e62deb` |
| B05 | S3 | Endereço com id malformado dá erro 500 em vez de "não encontrado" | F02-E5, F06-N1 | ✅ `6e62deb` |
| B06 | S3 | A 13ª dor/desejo/objeção/canal da persona some sem aviso | F02-E3 | ✅ `6e62deb` |
| B07 | S3 | Título da arte cortado no meio da palavra | F06-E2 + `text.test.ts` | ✅ `6e62deb` |
| B08 | S4 | Caixa de persona na oferta só muda depois da resposta do servidor | F02-H3 | ✅ `6e62deb` |

---

### B01 · S2 · Sessão encerrada + enviar formulário → tela branca

**Passos:** entrar · abrir "Novo cliente" numa aba · na outra aba, Conta → "Sair deste aparelho" · voltar à primeira aba, preencher `@outra.aba` e clicar "Ler o negócio".
**Esperado:** ir para "Entrar" e, depois do login, voltar para a mesma tela.
**Real:** "Application error: a client-side exception has occurred" (tela branca, em inglês). O texto digitado se perde. Acontece com qualquer formulário sempre que a sessão acaba (saiu em outra aba, "sair de todos", conta apagada).
**Evidência:** `pageerror: An unexpected response was received from the server.` — o middleware respondia à server action com um redirect para a página de login (HTML), que o cliente do Next não sabe ler.
**Por que S2:** a tela não tem saída; o usuário só se recupera recarregando, sem entender o que houve.
**Correção:** o middleware deixa a server action passar quando não há sessão; a própria action chama `requireUser()`, que responde com um redirect que o Next entende (`/entrar?next=<tela de origem>`). O RLS continua barrando qualquer leitura ou escrita sem usuário.

### B02 · S2 · Sem tela de erro própria

**Passos:** qualquer falha no servidor ou na rede (ex.: B03, B04, B01).
**Esperado:** mensagem em português, botão para tentar de novo e caminho de volta.
**Real:** página branca do Next em inglês ("Application error … see the server logs"), sem botão nenhum. Não existiam `error.tsx`, `global-error.tsx` nem `not-found.tsx`.
**Correção:** as três telas, em pt-BR, com "Tentar de novo" e "Ir para os clientes". O 404 explica que o item pode ter sido apagado ou ser de outra conta.

### B03 · S2 · Logo acima de 10 MB derruba a tela de Marca

**Passos:** Marca → enviar um arquivo de 11 MB como logo.
**Esperado:** "O arquivo passa de 10 MB."
**Real:** erro 500 (`Unexpected end of form`) e página branca. A validação de tamanho existia na action, mas o Next corta o corpo em 10 MB antes de a action rodar.
**Correção:** o tamanho é conferido no navegador antes de enviar (mostra o tamanho do arquivo e pede uma versão menor); o limite da action subiu para 11 MB, para a mensagem do servidor também funcionar perto do limite.

### B04 · S3 · Sem internet ao enviar → tela branca

**Passos:** Novo cliente → preencher → desligar a rede → "Ler o negócio".
**Esperado:** aviso de que está sem conexão.
**Real:** página branca (`Failed to fetch`).
**Correção:** a tela de erro reconhece falta de rede e mostra "Sem conexão", com "Tentar de novo". Limite que ficou: o texto digitado não é guardado (ver "a conferir").

### B05 · S3 · Id malformado no endereço → 500

**Passos:** abrir `/w/doceria-exemplo/personas/abc` (vale para ofertas, lote e criativo).
**Esperado:** 404 "Não encontramos esta página".
**Real:** 500. O Postgres recusa `abc` como uuid (erro `22P02`) e o erro subia.
**Correção:** a camada de dados trata `22P02` como "não existe" → 404. Id válido que não existe, ou de outra agência, já dava 404.

### B06 · S3 · Itens além do 12º somem sem aviso

**Passos:** Nova persona → 13 dores, uma por linha → criar.
**Esperado:** as 13 salvas, ou um aviso.
**Real:** só 12 salvas; a 13ª sumia em silêncio (o mesmo valia para desejos, objeções e canais).
**Correção:** limite subiu para 30 por lista; acima disso aparece erro no campo ("Use até 30 itens (tem 31).") e nada é descartado.

### B07 · S3 · Título da arte cortado no meio da palavra

**Passos:** oferta com nome longo ("Piso vinílico instalado com rodapé, acabamento completo e garantia estendida…") → gerar arte.
**Esperado:** título que termina numa palavra inteira.
**Real:** "…acabamento completo e garantia est" na arte final.
**Correção:** `clip()` corta no último espaço e fecha com "…"; vale para título (70) e subtítulo (110). 3 testes de unidade.

### B08 · S4 · Vínculo persona ↔ oferta demora a responder

**Passos:** página da oferta → desmarcar uma persona.
**Esperado:** a caixa desmarca na hora.
**Real:** a caixa continuava marcada até o servidor responder.
**Correção:** atualização otimista (`useOptimistic`), incluindo a troca da persona principal.

---

## A conferir (não reproduzido ou depende do ambiente real)

- **Renovação de sessão simultânea.** No simulador, duas renovações de token chegando juntas derrubavam a sessão (A04-E1 falhou 1 vez em 4). O Supabase real aceita o mesmo refresh token por 10 s justamente para isso; o simulador agora faz igual e o teste passou em todas as rodadas seguintes. Conferir no projeto real: deixar uma aba aberta mais de 1 h e usar.
- **Limite por IP confia no `x-forwarded-for`.** Se o app ficar atrás de um proxy que não sobrescreve esse cabeçalho, dá para trocar de IP a cada tentativa. O limite por e-mail (8 tentativas em 10 min) continua valendo. Na Vercel o cabeçalho é sobrescrito; conferir no host escolhido.
- **Texto digitado se perde depois de "Sem conexão".** A tela não quebra mais (B04), mas ao tentar de novo o formulário volta vazio. Melhoria possível: guardar o rascunho no navegador.
- **Vulnerabilidade do postcss** (`npm audit`, alta) vem do Next 15; some só com Next 16. Já registrada em `backend.md`.
- **Manual (precisa do seu Supabase):** e-mail chegando de verdade e fora do spam, links voltando para o seu domínio, `npm run check:supabase -- --fix`.
