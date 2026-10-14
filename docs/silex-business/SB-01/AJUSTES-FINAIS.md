# Ajustes finais do SB-01

## Aprovações registradas

O usuário aprovou conceitualmente a identidade visual, o design system e a direção de navegação: `/`, `/entrar`, `/app#home`, `/app#dashboard`, `/app#...` e compatibilidade dos hashes operacionais antigos. As composições B e C permanecem aprovadas e sem alteração estrutural. A Visão Geral continua independente. O filtro futuro de atalhos/cartões respeitará as permissões atuais.

Esta aprovação é de planejamento. O usuário autorizou especificamente o SB-02.1; o SB-02.2 segue condicionado à revisão e autorização explícita. SB-03 continua condicionado à autorização de implementação e aos testes de rotas, autenticação, autorização, histórico, sessão e logout. Aprovação visual não equivale a homologação de oferta comercial ou preparação de produção.

## Alterações desta revisão

| Item | Ajuste | Base/limite |
| --- | --- | --- |
| A — segunda demonstração | Lista fictícia de Vendas em lugar do segundo financeiro | Campos e situações confirmados em SalesPage, `frontend/src/sales.tsx:392–489`; sem integração ou indicador novo |
| B — Login | Mantido | Duas colunas desktop/tablet, uma mobile; HTML sem alteração |
| C — Inicial | Mantido | Empresa, atalhos e cartões; HTML sem alteração; Visão Geral independente |
| D — Nova despesa | Secundário neutro | Não é operação destrutiva; Estornar continua com aparência própria |
| D — Datas | dd/mm/aaaa nos campos ilustrativos De/Até | ISO originais preservados; solução futura documentada, sem editor de produção |
| D — Tabela | Orientação de rolagem em tablet/celular | Seis colunas e ações preservadas; região focável e descrição acessível |
| brand_name/company_name | Decisão registrada: Silex Business fixa; company_name identifica a empresa; brand_name é nome de apresentação compatível | Sem reclassificar dados legados, alterar schema/API/fiscal ou gravar marca no banco |
| Navegação | Direção marcada como aprovada conceitualmente | Implementação e testes permanecem no SB-03 |

Detalhes da proposta de dados: [DADOS-APRESENTACAO.md](DADOS-APRESENTACAO.md).

## Evidências

Renderizações A/D atualizadas em 1440, 768 e 375 px. B/C mantidos e re-renderizados para observar ausência de regressão causada pelo CSS compartilhado. [Galeria](prototipos/index.html), [imagens](README.md), [relatório](VERIFICACAO.md).

Baseline original de produção preservado. Esta revisão tem baseline próprio [revisao-final-antes.json](revisao-final-antes.json) e resultado [revisao-final-depois.json](revisao-final-depois.json), incluindo preservação byte a byte dos HTMLs B/C e dos ativos oficiais. Manifesto e ZIP foram regenerados; nenhum código novo nas árvores frontend/backend/data.

## Pendências

1. Revisar o resultado isolado do SB-02.1 e aprovar ou pedir ajustes.
2. Autorizar explicitamente o SB-02.2 depois da revisão. Escolha/homologação de DateField e validação de rolagem funcional ficam no SB-05; fluxos de navegação/sessão nos testes do SB-03.
