# Correções e ângulo

Base: 45 avaliações com link, **1 fonte só (Trustpilot)**. Todos os temas são finos. Detalhes e citações em `feedback.md`.

## 1. O que eles odeiam (o app faz e faz mal)

| # | problema | avaliações | fontes | citação |
| --- | --- | --- | --- | --- |
| 1 | Cobra e gasta crédito sem entregar, inclusive quando a geração falha | 5 | 1 · fino | "ads no longer load and still charge me credits!!!" ([link](https://www.trustpilot.com/reviews/6a4b3368708802c04967fe6b)) |
| 2 | Arte e leitura da marca erradas: produto que não é do cliente, brand DNA impreciso | 4 | 1 · fino | "most content was of products that are not even my product" ([link](https://www.trustpilot.com/reviews/6a1cae354ce8e1a919820aea)) |
| 3 | Trava ou carrega para sempre | 3 | 1 · fino | "the customer profiles was loading for 4 hours and nothing happened" ([link](https://www.trustpilot.com/reviews/6a1cae354ce8e1a919820aea)) |
| 4 | Suporte que ninguém alcança | 3 | 1 · fino | "No support at all." ([link](https://www.trustpilot.com/reviews/6a0606fe7bf9d8d234e1ab8c)) |

## 2. O que falta (pedido pelo nome)

| # | pedido | avaliações | fontes | citação |
| --- | --- | --- | --- | --- |
| 1 | Testar antes de pagar | 5 | 1 · fino | "You can not even run demo screenshots once before you pay" ([link](https://www.trustpilot.com/reviews/6a3533212be3f1d31be9faca)) |

É o único pedido explícito na amostra.

## 3. O que ninguém resolve (grupos ignorados)

| # | grupo | evidência |
| --- | --- | --- |
| 1 | Agências com vários clientes | 1 avaliação, e condicionada ao preço: "If Vibiz can handle the pricing model, they can rule the agency galaxy" ([link](https://www.trustpilot.com/reviews/6a8eca2dd5c635963e9d6051)) · **muito fino** |
| 2 | Comércio e serviço local, sem e-commerce, atendido em português | **nenhuma avaliação.** Os elogios vêm de e-commerce e de quem trabalha sozinho. É um vazio, não uma reclamação |

## Plano de correção

Escolhido por evidência × custo de fazer. O clone é ferramenta interna e você paga a API direto, sem créditos; por isso os itens de preço e cobrança viram transparência de custo, não plano de assinatura. Se um dia vender para outras agências, preço e cobrança vão para o `/replica-launch`.

| # | o que construir ou mudar | tema | tamanho | skill | já tem no clone |
| --- | --- | --- | --- | --- | --- |
| C1 | **Rascunho grátis antes de gastar.** O modo de teste atual (copy por modelo + fundo abstrato, custo 0) vira um passo oficial: "ver rascunho" → "gerar com IA". Só se paga a imagem de IA quando o rascunho foi aprovado | pedido 1 (5) · odeiam 2 | P | `/replica-build` | quase tudo; falta o botão e a troca de fundo depois |
| C2 | **Leitura com fonte e confiança por campo.** Cada cor, tom, público e oferta lida do site mostra de onde veio (página, post) e se é certeza ou chute; o que for chute pede confirmação antes da primeira arte | odeiam 2 (4) | M | `/replica-build` (bloco 1) | edição inline e marca de "editado por você" |
| C3 | **A arte só usa o que é do cliente.** Gera só a partir de oferta confirmada; logo oficial como arquivo, nunca redesenhado; foto de produto, só a dele | odeiam 2 (4) | P | `/replica-build` | oferta obrigatória e logo como arquivo já estão prontos |
| C4 | **Checagem antes de mostrar.** Logo presente e legível, contraste do texto, título inteiro (B07 já corrigido), produto bate com a oferta. Se falhar, refaz sozinho ou mostra o motivo | odeiam 2 (4) | M | `/replica-build` | contraste e corte de título |
| C5 | **Nada fica carregando para sempre.** Cada etapa tem tempo-limite; ao estourar, vira "pulado" ou "falhou" com o motivo e "tentar de novo". Jobs órfãos já são retomados | odeiam 3 (3) | P | `/replica-build` | estados, retomada e tentar de novo |
| C6 | **Custo à vista.** Quanto cada cliente custou no mês, por arte e por pesquisa; falha não conta; o teto avisa antes de estourar | odeiam 1 (5) | P | `/replica-build` | custo antes de gerar, teto mensal, falha não conta |
| C7 | *(só se vender)* Suporte humano visível, por WhatsApp, e cancelamento em um clique | odeiam 4 (3), 1 | P | `/replica-launch` | — |

C1 a C6 entraram no `features.csv` com `original = no`.

## O ângulo

**A — Fiel à marca do cliente**
> Para agências de social media que atendem comércio local e não podem entregar ao cliente uma arte com produto que não é dele ou logo redesenhado, o clone gera só a partir do que o próprio cliente confirmou: oferta dele, logo oficial como arquivo, cores revisadas.
> Evidência: qualidade e fidelidade à marca, 4 avaliações em 1 fonte (fino).

**B — Vê antes, paga só o que funcionou**
> Para quem cansou de gastar crédito em arte feia ou que falhou, o clone mostra o rascunho de graça e só cobra a imagem de IA da arte aprovada; falha não custa nada.
> Evidência: pagar antes de testar + cobrança, 10 avaliações em 1 fonte (fino).

**C — Não trava**
> Para quem já viu a ferramenta carregar por horas, toda etapa do clone tem tempo-limite, motivo claro e "tentar de novo".
> Evidência: confiabilidade, 3 avaliações em 1 fonte (fino).

**Recomendado: A.** Para uma agência, a arte errada custa a confiança do cliente, que vale mais que crédito. A é também onde o clone já está à frente (logo oficial como arquivo, oferta obrigatória). B tem mais avaliações, mas no uso interno você já paga a API a preço de custo; B só vira o argumento principal se você vender o clone para outras agências. Nesse caso, junte A e B.

O "feito para comércio local, em português" é um diferencial real, mas nenhuma avaliação o sustenta. Use como contexto, não como prova.

Não use o nome Vibiz no nome do app, em anúncio ou em página de venda. Uma página de comparação factual é assunto para advogado.
