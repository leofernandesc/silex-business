# Testes e limites — SB-06D.1

Ambientes isolados, fixture sintética, nenhum banco persistente usado. `test-results-summary.json` e `test-matrix.json` registram os resultados por projeto/resolução; logs e comparações de payload acompanham a entrega.

| Grupo | Resultado / escopo |
| --- | --- |
| TypeScript e Vite | Build baseline/candidata e tipagem explícita de teste/config aprovados; sem script lint disponível |
| Frontend | Baseline 71; candidata 96; 25 novos casos civis/instantes/mês, inválido/vazio, bissextos, virada e ordenação |
| Fusos | 25 casos em UTC, 25 Manaus, 25 Kiritimati; não implica equivalência universal dos atalhos locais de Pagar/Receber |
| Backend | 69 em cada versão; aviso Starlette/httpx preexistente, sem alteração de dependências |
| Regressão existente | 249 cenários anteriores + 18 P04/P09/SB-06C, nas três larguras |
| Datas candidatas | 9 E2E: relatórios mensais, cadastro/edição de conta e filtro ISO, em 1440/768/375 |
| Comparação baseline | 6 E2E de cadastro/edição e filtro; payloads/respostas completos comparados com a candidata |
| P01 | 51 testes de componente + 21 fluxos representativos, em fixture separada; sem compartilhar o caixa fechado com a suíte de vendas |
| Financeiro | 35 JSON equivalentes; 30 exportações/impressões com SHA-256 iguais; 40 handlers JSX idênticos |
| Apresentação válida | 1827 datas civis e quatro instantes mantêm texto anterior |
| Visual | 24 rotas × 3 larguras em ambas versões, tabelas/controles/larguras; Home/Relatórios com fontes computadas 200% |
| Nativos | Firefox instalado, três combinações locale/fuso, nas duas versões; ISO, validade, limites, tipo efetivo de month e retorno de foco registrados |

## Falha inicial do teste novo — não apagada

A rodada ampla carregou a primeira versão do novo teste de intervalo: escolhia 01/10/2026 a 31/10/2026, que já era o período Mês ativo. O teste esperava uma nova resposta sem mudar a chave de useLoad; houve timeout nos três projetos. As demais regressões são analisadas independentemente dessa falha de autoria.

O cenário corrigido **muda efetivamente** a data inicial para 01/09/2026 e mantém as verificações de ISO, legenda brasileira, resposta e limites. Não foi alterado código do produto para forçar refetch. Não foram modificadas asserções antigas, removidas verificações ou introduzidos retries. A execução final em fixtures novas testa o mesmo cenário no baseline e na candidata; os resultados iniciais permanecem no log e no resumo, sem serem apresentados como uma rodada integral aprovada.

Os 348 cenários candidatos distintos finais correspondem a 267 regressões existentes, nove datas e 72 modais. Os seis cenários baseline são comparações adicionais; não são somados como novos testes candidatos. As seis aprovações de datas já presentes na rodada inicial não são contadas duas vezes.

## V01, T01 e acessibilidade

V01: bateria dirigida de 60 cliques em Abrir livro caixa, dez por largura/versão, com sessão e carregamento registrados. Destino, console e rede constam em native-and-v01.json. Os 60 destinos passaram com sessão 200 e sem pageerror. A instrumentação registrou 124 cancelamentos NS_BINDING_ABORTED (64 baseline, 60 candidata) na bateria que alterna hashes e recarrega explicitamente as páginas; são cancelamentos de consultas pendentes, não respostas HTTP de erro. As listas por clique são cumulativas e não devem ser somadas como eventos independentes. Os logs completos foram preservados. Mesmo aprovados, esses ensaios não identificam a causa histórica e não encerram V01.

T01: os cenários públicos existentes são reexecutados sem mudar página, asserções ou espera networkidle. O resultado deste incremento fica registrado no resumo; uma aprovação não encerra o timeout histórico sem diagnóstico causal.

P01/P02/P03/P04/P06/P08/P09/V02/R02 têm cobertura de regressão pertinente. Os CSS e componentes de foco/menu/cabeçalho não mudam. Elementos desabilitados, decoração e exceções de alvos não são tratados com limiar universal incorreto. Estilos de gradientes continuam com as limitações da auditoria anterior, sem certificação pixel a pixel presumida.

Texto computado 200% é **simulação**, não zoom nativo. Não houve homologação com leitor de tela real, toque físico, outros navegadores ou zoom nativo. Os excessos históricos de conteúdo em Home/Visão Geral e demais casos extremos não foram ocultados nem corrigidos incidentalmente. P05 continua parcial e P07 pendente.
