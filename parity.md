# Paridade — clone × Vibiz (fatia: analisar o negócio → conteúdo e anúncios)

17/10/2026, depois do `/replica-test` (60/60 testes passando, 8 bugs corrigidos, nenhum aberto).

## Veredito: **ainda não dá para lançar**

Faltam 12 dos 29 itens obrigatórios, e outros 6 estão pela metade. O que já existe funciona bem e foi testado de ponta a ponta. Só que a parte que faz o Vibiz valer a pena ainda não foi construída: a IA que lê o negócio, pesquisa o mercado e escreve e desenha as artes.

| | |
| --- | --- |
| **Paridade de funcionalidades** | **39%** (53 de 137 pontos) |
| Obrigatórios | 11 feitos · 6 pela metade · 12 faltando, de 29 |
| Desejáveis | 3 feitos · 5 pela metade · 13 faltando, de 21 |
| Opcionais | 0 de 8 |
| Layout | estrutura parecida nas telas construídas; maior diferença: falta o chat do agente sempre visível (ver abaixo) |
| Bugs abertos | 0 S1 · 0 S2 |

Como a nota é calculada: obrigatório vale 3, desejável 2, opcional 1, e "pela metade" conta metade. Fora da conta: as 9 linhas marcadas como `skip` (fora da fatia ou proprietárias) e as 2 de infraestrutura que só o clone lista (RLS, limite de tentativas). Fonte: `features.csv`.

## Paridade por área (da mais fraca para a mais forte)

| área | nota | o que tem | o que falta |
| --- | --- | --- | --- |
| Base de conhecimento | 0% | — | resumo do negócio gerado, upload de PDFs |
| Pesquisa | 0% | telas de aviso | concorrentes, anunciantes do nicho, raspar anúncios, tendências, aviso de custo |
| Desempenho | 0% | telas de aviso | top posts, melhor horário, métricas, anúncios vencedores |
| Estratégia | 0% | telas de aviso | objetivo do cliente, próximos passos com o porquê, quadro de propostas |
| Agente | 0% | tela de aviso | chat que planeja e executa, memória por cliente |
| Editar | 0% | aviso na tela do criativo | editar falando com versões, antes/depois |
| Qualidade | 0% | tela de aviso | veredito de marca, nota do anúncio, linhagem |
| Publicar | 15% | legenda pronta para copiar | legenda por canal, calendário semanal e mensal, swipe |
| Marca | 41% | edição inline, logo oficial por upload | ler logo/cores/fontes/tom/público do site; fotos e pessoas reais |
| Personas | 50% | criar e editar à mão | gerar automaticamente |
| Criar | 53% | arte na marca com logo real, 3 formatos, oferta + persona, progresso, galeria | carrossel, IA no texto e na imagem, tendência ou concorrente como ângulo, remix, até 20 variações |
| Cadastro do cliente | 62% | aceita site, @ e link do IG; progresso em 7 etapas | ler de verdade o site e o Instagram (hoje é modo de teste) |
| Workspace | 75% | vários clientes, seletor, isolamento | convidar cliente para aprovar |
| Login e conta | 93% | senha, link mágico, recuperar senha, sair de todos, apagar conta | entrar com Google |
| Ofertas | 100% | tipos, preço em R$, persona principal | — |

## O que falta, na ordem de construir

Cada etapa destrava a próxima. A nota é a projetada ao fim de cada uma.

| # | bloco | itens que fecha | nota | obrigatórios |
| --- | --- | --- | --- | --- |
| 1 | **Ler o negócio de verdade**: site e Instagram via Apify; Claude extrai tom, público e resumo | site, @IG, logo/cores/fontes, tom e público, resumo do negócio | 46% | 16/29 |
| 2 | **IA na criação**: texto pelo Claude, fundo pelo gerador de imagem, personas geradas | arte na marca, copy por público, gerar personas | 51% | 19/29 |
| 3 | **Carrossel + editar falando** (marco M3) | carrossel, editar com versões, antes/depois | 57% | 21/29 |
| 4 | **Pesquisa** (M2): concorrentes, anúncios do nicho no Brasil (Meta Ad Library), tendências, usar como ângulo na criação | 4 obrigatórios + aviso de custo | 67% | 25/29 |
| 5 | **Calendário + próximos passos** (M4): semana, legenda por canal, recomendações, top posts (precisa conectar o Instagram) | 4 obrigatórios | 74% | 29/29 |

Depois do bloco 5 todos os obrigatórios estão feitos. Para passar de 80% faltam ainda: variações até 20, base de PDFs, nota do anúncio, swipe e convite de cliente.

## Layout

**Não houve comparação por print, e foi de propósito.** O recon foi feito só com páginas públicas, sem entrar na sua conta do Vibiz, porque os termos deles (§9) proíbem usar o produto para construir um concorrente. Então não existe `replica/screens/` com prints do original. A comparação abaixo é estrutural: o clone (prints em `clone-screens/`, 1440×900 e 390×844) contra a descrição de cada tela no recon. Só entram as telas que o recon viu em página pública (confiança A).

| tela | resultado | diferenças, da maior para a menor |
| --- | --- | --- |
| S01 Adicionar negócio | bate | — mesmo campo único + botão "analisar" |
| S03 Marca | perto | sem os chips de fonte (troca de fonte não existe) |
| S15 Criar | perto | sem o seletor de formato (só imagem; carrossel falta); posicionamento e custo estão no mesmo lugar |
| S22 Trocar cliente | perto | seletor no cabeçalho igual; falta "convidar" |
| S18 Criativo | em parte | tem prévia no feed e aba de versões; faltam o campo "o que mudar", o antes/depois e o veredito de marca |
| S13 Próximos passos · S14 Agente · S20 Swipe · S21 Calendário | diferente | ainda são só o aviso "entra no marco Mx" |

**Maior diferença estrutural:** no original, o chat do agente fica sempre visível ao lado das telas e é por onde muita coisa começa. O clone é todo por menu e formulário. Nada contra: é mais previsível para quem opera vários clientes. Mas quem vem do Vibiz vai sentir falta.

As cores ficaram fora da comparação de propósito: o clone é azul-marinho e amarelo, e é assim que tem que ser.

## Comportamento

| fluxo | o original faz | o clone faz | decisão |
| --- | --- | --- | --- |
| F06 Gerar arte | ~4 cliques, crédito estimado antes | **2 cliques** (Criar → Gerar): oferta e persona principal já vêm escolhidas; custo antes | manter, ganho |
| F01 Cadastrar cliente | colar URL → lê o site → brand DNA | mesmo caminho e mesmos ~3 cliques, mas a leitura é de teste (sugere paleta pelo nome e avisa) | construir (bloco 1) |
| F02 Persona e oferta | gera personas e ofertas sozinho; você só ajusta | você digita tudo à mão (~5 min por cliente) | construir (bloco 2) |
| F06 Cliente sem marca pronta | bloqueia ou gera "fora da marca" | bloqueia e diz o motivo (ex.: "a marca ainda não tem cores") | manter |
| F06 Geração falhou | devolve o crédito | marca "falhou", botão "tentar de novo", custo não conta | manter |
| F07 Ajustar a arte | escreve o que mudar → nova versão, a anterior fica | só "mais uma variação" | construir (bloco 3) |
| Sessão caiu no meio | — | volta ao login e, depois de entrar, para a mesma tela | manter |
| Sem internet / erro | — | tela em português com "Tentar de novo" (o texto digitado se perde) | melhorar: guardar rascunho |
| E-mails | em inglês | confirmação, link mágico e senha nova em português | manter, ganho |
| O que fica salvo | brand DNA, personas, ofertas, criativos e versões, memória do agente | tudo isso menos a memória do agente | construir com o agente |
| Arte | logo às vezes redesenhado pela IA (corrigido depois com o veredito) | logo oficial entra como arquivo; acentos sempre certos | manter, ganho |

## Para ficar melhor que o original

Paridade não é o objetivo. Três ganhos já existem: arte em 2 cliques, logo real sempre e tudo em português. Para o clone ter motivo de existir em vez de você só assinar o Vibiz, o próximo passo depois dos blocos 1 e 2 é o `/replica-entrepreneur`: ele lê o que os usuários reclamam do original e transforma isso em vantagem.
