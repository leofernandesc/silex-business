# P2 — linguagem e identificação da DRE

## Causa comprovada

No commit base homologado, o fallback `code.replaceAll('_',' ')` apresentava `service_not_completed` em inglês. Fatos, botões de reconhecimento/cancelamento, prévias e impressão usavam chaves canônicas como descrição principal; rubricas apareciam como códigos em cobertura e classificação. O CSV humano herdava rótulos técnicos. Isso foi constatado no código da base e no achado da homologação anterior, sem fabricar uma nova execução do baseline nesta release.

## Correção localizada

| Arquivo | Mudança / preservação |
|---|---|
| `frontend/src/drePresentation.ts` | Tradução contextual dos códigos do motor, rubricas, cobertura, evidências de sistema, operações e erros. CSV legível sem recalcular centavos, com coluna técnica final e proteção contra fórmula textual. |
| `frontend/src/dreSource.tsx` | Nome amigável e links existentes; descrição por endpoints já protegidos, somente em detalhes/modal selecionado. Indisponibilidade não vira dado vazio confirmado. Chaves/códigos ficam em details recolhido. |
| `frontend/src/dreExport.ts` | Relê e reautoriza a DRE pelo endpoint existente antes do download; revogação não exporta dados antigos da tela. |
| `frontend/src/dre.tsx` | Integra apresentação em demonstrativo, pendências, reconhecimento, cancelamento, prévia, cobertura, mapeamento, histórico, CSV e impressão. Payloads, versões e valores preservados. |
| `frontend/src/dre.css` | Estilos locais; descrição legível, quebra de texto e detalhes técnicos ocultos no print. |
| `frontend/src/drePresentation.test.ts` | 16 testes de apresentação, códigos, evidências, erros, IDs inválidos e CSV sem mutação. |
| `frontend/tests/dre-release-ux.spec.ts` | Quatro jornadas desktop/mobile: pendência, descrição autorizada, negativa/reautorização e cancelamento/CSV/PDF. |
| `frontend/tests/dre-integration.spec.ts`, `dre-review-fixes.spec.ts` | Seletores acompanham rótulos humanos; verificações monetárias, segurança e fluxos mantidas. |
| `frontend/playwright.integration.config.ts` | Inclui oito novos casos na matriz existente; sem retries. |

Descrições de vendas sem endpoint de detalhe autorizado não são inventadas: usa-se “Venda #N”. Impressão/CSV usam tipo/número da operação e referências permitidas; não disparam consultas de todas as fontes só para enriquecimento. A descrição comercial disponível é consultada no detalhe/modal. Nenhum acesso amplo ao cadastro financeiro nem cache entre identidades.

## Antes / depois

| Antes | Depois |
|---|---|
| `service not completed` | “Serviço ainda não concluído. Confirme a execução na ordem antes de reconhecer a receita.” |
| `finance_entry:6:principal` como origem | “Conta a receber #6”; descrição protegida no detalhe e identificador no disclosure técnico |
| `verified_finalization` | “Venda finalizada e conferida” |
| Cobertura `RB` / competências ISO na prévia | “Receita bruta” / `MM/AAAA` |
| Erro técnico/HTTP genérico em inglês | Orientação pt-BR para sessão, permissão, indisponibilidade ou nova conferência |

Texto escrito pelo usuário e justificativas históricas não são reescritos ou traduzidos arbitrariamente. Chaves originais continuam nos contratos, no armazenamento e na coluna de auditoria do CSV. `/finance/dre.csv` continua disponível com seu contrato técnico original; o botão humano usa documento legível intencionalmente. Não houve conversão dos CSVs legados.

## Reprodução durante o desenvolvimento

1. Primeira bateria: 22 PASS / 2 FAIL em cada motor. O modal de cancelamento recebia `origin`, sem `entry_ids`, e a descrição não era consultada. Corrigido o resolver para utilizar a referência já autorizada da origem.
2. Segunda bateria: 22 PASS / 2 FAIL em cada motor. A prévia do ajuste tinha chave mas não origem e mostrava “Lançamento financeiro” em vez de “Conta a receber”. Reutilizado o contexto da pendência; nenhuma API mudou.
3. Terceira bateria congelada: 24/24 em Chromium e 24/24 em Firefox. Mesmas asserções, sem skips/retries/timeout aumentado. [Logs e resultados](FINAL-TEST-RESULTS.md).

Os dois achados de apresentação foram corrigidos no mesmo commit de implementação; não eram falhas financeiras nem divergência de fixture. As reexecuções não aumentam a cobertura distinta.

## Evidências e limites

[Desktop Chromium](evidence/dre-ux-desktop-chromium.png), [mobile Chromium](evidence/dre-ux-mobile-chromium.png), [desktop Firefox](evidence/dre-ux-desktop-firefox.png), [mobile Firefox](evidence/dre-ux-mobile-firefox.png), [PDF A4](evidence/dre-ux-a4.pdf), [CSV legível fictício](evidence/dre-readable-desktop-chromium.csv).

PDF Chromium A4, duas páginas: título/período, rubricas, fatos originais/ajuste de +10001/-10001 centavos e pendências legíveis; texto extraído e inspeção visual realizados. Não é impressão física nem PDF acessível homologado (arquivo não marcado/tagged). Firefox teve mídia print validada; geração PDF é pelo Chromium. Mobile 375 px e desktop 1440 px sem overflow do documento; tabelas preservam rolagem própria para todas as colunas. Axe sem violações nos cenários dirigidos; isso não equivale a conformidade WCAG completa ou uso real com leitor de tela.

**P2 corrigido tecnicamente**, sujeito à revisão independente e avaliação humana de clareza. Nenhuma alteração de cálculo, backend, contrato de API, autenticação, migração ou dados persistentes.
