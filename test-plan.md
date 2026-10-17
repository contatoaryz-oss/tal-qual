# Plano de testes

Alvo: o clone em `replica/app`, rodando local (Postgres 16 + simulador do Supabase Auth) com `npm run seed`.
Automático: `npm run e2e` (Playwright, specs em `app/e2e/`). Toda spec falha com erro de console, resposta 5xx ou violação do axe (WCAG 2.2 AA).
Legenda: **H** caminho feliz · **E** caso de borda · **N** caso negativo · status: ✅ passou · ❌ falhou (ver `bugs.md`) · ⏸ não construído · 👤 manual.

## F01 — Cadastrar cliente e entender o negócio (S01, S02, S03)

| caso | o que | status |
| --- | --- | --- |
| F01-H1 | colar `@perfil` → leitura com 7 etapas → "Leitura concluída" → Marca | |
| F01-H2 | colar site (`dominio.com.br`) → mesmo fluxo, nome sugerido do domínio | |
| F01-H3 | editar tom de voz pelo teclado (Enter/Ctrl+Enter salva, Esc cancela, foco volta) e o valor persiste | |
| F01-H4 | trocar cor, salvar, recarregar: cor persiste e campo fica marcado como editado | |
| F01-H5 | enviar logo PNG → aparece na Marca e na arte | |
| F01-E1 | campo vazio / texto que não é site nem @ → erro no campo, `aria-invalid` | |
| F01-E2 | nome com acento e emoji ("Café São João ☕") → slug limpo, nome exibido certo | |
| F01-E3 | nome com 80 caracteres → cabe no seletor de cliente e nos cards | |
| F01-E4 | dois clientes com o mesmo nome → slugs diferentes (`-2`) | |
| F01-E5 | clique duplo em "Ler o negócio" → um cliente só | |
| F01-E6 | recarregar a tela de leitura no meio → continua e termina | |
| F01-E7 | logo maior que 10 MB → mensagem clara, nada quebra | |
| F01-E8 | arquivo que não é imagem com extensão .png → mensagem clara | |
| F01-E9 | hex inválido → botão salvar desabilitado | |
| F01-E10 | 390 px de largura, tema escuro, só teclado | |
| F01-N1 | sem conexão ao enviar → mensagem, sem tela de erro | |

## F02 — Personas e ofertas (S05–S08)

| caso | o que | status |
| --- | --- | --- |
| F02-H1 | criar persona com dores e desejos → detalhe → editar faixa de idade | |
| F02-H2 | criar oferta com preço "189,90" e persona marcada → vira principal | |
| F02-H3 | tornar outra persona principal; desvincular a principal → a próxima assume | |
| F02-H4 | apagar persona (com confirmação) → some da lista e da oferta; criativos continuam | |
| F02-E1 | nome vazio, preço "abc", "1,2,3" → erros nos campos | |
| F02-E2 | preço "R$ 1.299,00" → R$ 1.299,00 na lista | |
| F02-E3 | 13 dores (uma por linha) → o que acontece com a 13ª | |
| F02-E4 | emoji e acento no nome da oferta | |
| F02-E5 | endereço com id que não existe ou inválido (`/personas/abc`) → 404 | |
| F02-N1 | abrir persona apagada → 404 | |

## F03 — Mapear concorrência · F04 — Tendências · F05 — Próximos passos · F08 — Calendário

⏸ Não construídos (marcos M2–M4). Testado só: a rota abre, mostra "entra no marco Mx" e o menu marca "em breve" (E-STUB-1).

## F06 — Gerar conteúdo/anúncio (S15, S16, S17)

| caso | o que | status |
| --- | --- | --- |
| F06-H1 | escolher oferta → persona principal entra sozinha → 3 artes → lote → prontas → galeria | |
| F06-H2 | stories 9:16 → PNG 1080×1920 | |
| F06-E1 | clique duplo em "Gerar" → uma leva só | |
| F06-E2 | oferta com título de 100 caracteres → título da arte legível, sem cortar no meio da palavra | |
| F06-E3 | emoji no título da oferta → arte gera | |
| F06-E4 | cliente sem oferta → estado vazio com caminho para cadastrar | |
| F06-E5 | cliente sem cores → bloqueado com o motivo | |
| F06-E6 | recarregar o lote no meio → termina | |
| F06-E7 | apagar a oferta enquanto gera → arte termina ou falha com mensagem | |
| F06-N1 | lote de outra agência / id inválido → 404 | |

## F07 — Revisar (S18) — parcial

| caso | o que | status |
| --- | --- | --- |
| F07-H1 | abrir criativo → prévia, texto (copiar), versões; baixar PNG válido | |
| F07-H2 | favoritar → filtro "Favoritas" mostra 1 | |
| F07-H3 | "Mais uma variação" → novo lote de 1 | |
| F07-H4 | apagar criativo → some e o arquivo some do armazenamento | |
| F07-E1 | editar falando, antes/depois | ⏸ M3 |

## A — Login e conta

| caso | o que | status |
| --- | --- | --- |
| A01-H1 | criar conta → e-mail em pt-BR → confirmar → entra, agência nova vazia | |
| A01-E1 | senhas diferentes, e-mail inválido, senha < 8 | |
| A01-E2 | cadastrar de novo um e-mail já confirmado → mesma resposta, nenhum e-mail novo vaza dado | |
| A01-N1 | entrar antes de confirmar → "confirme seu e-mail" | |
| A02-H1 | entrar com senha → volta para a página pedida (`next`) | |
| A02-H2 | link mágico entra uma vez; reusar → "link expirou" | |
| A02-N1 | senha errada → mensagem; 9ª tentativa → bloqueio | |
| A02-N2 | `next=//site-externo` → fica no app | |
| A03-H1 | esqueci a senha → link → nova senha → a antiga deixa de valer | |
| A04-H1 | sair → voltar no navegador não mostra dado da agência | |
| A04-H2 | sair de todos → a outra sessão cai | |
| A04-E1 | token expirado → renova sozinho sem deslogar | |
| A04-E2 | duas abas: sair numa → ação na outra manda para entrar | |
| A05-H1 | apagar conta (digitando o e-mail) → login e dados somem | |
| A05-N1 | confirmação errada → não apaga | |

## X — Isolamento e arquivos

| caso | o que | status |
| --- | --- | --- |
| X01-H1 | segundo usuário: 0 clientes; páginas, lotes, criativos do primeiro → 404 | |
| X01-H2 | mesmo slug em agências diferentes não colide | |
| X01-H3 | SQL: intruso vê 0 linhas, não escreve; membro não altera o teto; `anon` sem acesso | |
| X02-N1 | arquivo de outra agência ou sem login → 404 | |
| X02-N2 | caminho com `..` ou id malformado → 404 | |

## 👤 Manual (precisa do seu Supabase real)

- [ ] E-mail chega de verdade (SMTP), sem cair no spam, com o modelo em português.
- [ ] Links do e-mail voltam para o seu domínio (Redirect URLs configuradas).
- [ ] `npm run check:supabase -- --fix` sem falhas (inclui gravar e apagar no Storage).
- [ ] Login com Google (quando ligar o OAuth).
