# Build log

Marco M0 (fluxo principal), 17/10/2026. App em `replica/app` (Next.js 15 + Tailwind v4 + Radix, tokens de `replica/design`).
Dados: camada falsa em `.data/db.json` com as assinaturas finais (`src/lib/data/index.ts`). Jobs no próprio processo.
Rodar: `cd replica/app && npm install && npm run dev` → http://localhost:3000. Apagar `.data/` volta aos dados de exemplo.

| tela | data | status | o que falta | o que deu mais trabalho |
| --- | --- | --- | --- | --- |
| casca | 17/10 | feito | — | Next 15 não roda com TypeScript 7 (fixado TS 6); constante importada de arquivo `'use client'` vira referência de cliente no servidor e quebrou a lista de ofertas (rótulos movidos para `lib/labels.ts`) |
| S22 Clientes | 17/10 | feito | arquivar cliente, busca | — |
| S01 Novo cliente | 17/10 | feito | — | aceitar site, @ e instagram.com/... no mesmo campo (parser com teste) |
| S02 Lendo o negócio | 17/10 | parcial | leitura real (Apify), Realtime no lugar do polling | etapas honestas: o que o modo de teste não lê aparece como "pulado" com instrução, não inventado |
| S03 Marca | 17/10 | parcial | extração automática de tom/público, troca de fonte | foco voltando ao campo depois de salvar dentro de uma transição (rAF era cedo demais); logo com margem transparente ficava pequeno (corte no upload); SVG enviado vira PNG para não servir script |
| S05 Personas | 17/10 | feito | geração automática (Claude) | — |
| S06 Persona | 17/10 | feito | falas literais do cliente (campo existe no modelo) | — |
| S07 Ofertas | 17/10 | feito | geração a partir do site | — |
| S08 Oferta | 17/10 | feito | — | regra de "uma persona principal" igual ao índice parcial do SQL |
| S15 Criar | 17/10 | parcial | carrossel, estilo, fontes de pesquisa (tendência/anúncio) como ângulo | — |
| S16 Gerando | 17/10 | feito | — | retomar jobs órfãos se o servidor reiniciar no meio |
| S17 Galeria | 17/10 | feito | filtro por formato e persona | — |
| S18 Criativo | 17/10 | parcial | editar falando, antes/depois, nota de qualidade (M3/M4) | — |
| S04, S09–S14, S19–S21, S23, S24 | 17/10 | stub | rota existe com aviso do marco em que entra | — |

## Maior que parecia

- **"Gerar imagem na marca" é o item mais caro do clone, e só metade dele está pronta.** A composição definitiva (logo oficial como arquivo, headline e chamada com acento certo, cor do texto escolhida pelo contraste) funciona e gera PNG 1080×1350 / 1080×1920. O fundo ainda é abstrato e a copy sai de modelos prontos. Os dois entram no backend, atrás de `ImageProvider` e `CopyWriter`, e as telas não mudam.
- **Ler o site ou o Instagram do cliente** não roda neste ambiente: a rede só alcança registros de pacote. A leitura está atrás de `SiteReader`. Hoje sugere uma paleta pelo nome e diz isso na tela.

## Verificação feita

- Fluxo inteiro em Playwright: novo cliente → leitura → marca (edição, cor, logo) → persona → oferta → criar 3 artes → lote → galeria → criativo → baixar PNG → favoritar.
- Uma arte gerada usando só o teclado.
- axe (WCAG 2.2 A/AA): 12 telas × 2 temas × 390/1440 px = 48 checagens, 0 violações, 0 rolagem lateral.
- Console: 0 erros nas telas (o único aviso foi do próprio Playwright injetando `caret-color` ao tirar print; sem print, 0 em 8 recargas).
- Testes de unidade dos parsers de endereço e preço: `npm test` (4/4).
- Prints para o `/replica-diff` em `replica/clone-screens/` (sem prints do original para comparar: o recon foi feito sem entrar na conta).
