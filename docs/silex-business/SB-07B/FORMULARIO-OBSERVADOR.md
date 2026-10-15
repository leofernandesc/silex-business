# Ficha do observador — SB-07B

**Não preencher por inferência.** Uma linha de evidência corresponde a uma sessão humana realmente observada. Não houve participantes nesta preparação.

## Contexto da sessão

| Campo | Registro |
|---|---|
| Código anônimo | |
| Data e horário | |
| Observador | |
| Sistema operacional / escala | |
| Navegador e versão | |
| Idioma do navegador | |
| Dispositivo físico ou simulado | |
| Resolução / zoom | |
| Commit testado | `0ea8ed077afba7c00779f81be765d1bacfbd3ae1` |

Antes de entregar o roteiro ao participante, o observador deve, no banco descartável, criar um serviço fictício com data ISO `2026-03-04`, descrição `Referência de leitura <código>`, e deixar seu formulário de edição aberto. Não mostrar esta instrução nem revelar a data esperada durante a sessão.

## Evidência observada

| Tarefa | Concluída? | Resposta/ação observada, de preferência literal | Expectativa técnica separada | Dúvida ou falha |
|---|---|---|---|---|
| Interpretou o registro de referência sem conhecer o alvo | | | ISO do controle `2026-03-04`; legenda visível `Data: 04/03/2026` | |
| Criou serviço com 04/03/2026 | | | Controle contém ISO `2026-03-04`; conferência visível `Data: 04/03/2026` | |
| Leu a data antes de salvar | | | Interpreta 04 como dia e 03 como mês, ou percebe dúvida | |
| Comparou editor e legenda | | | Consegue relacionar a apresentação nativa à conferência brasileira | |
| Editou para 29/02/2024 | | | Data válida de ano bissexto | |
| Salvou, atualizou e conferiu | | | Valor permanece `2024-02-29`; lista exibe `29/02/2024` | |
| Conferiu vencimento 31/12/2026 | | | ISO esperado `2026-12-31` | |
| Conferiu competência 01/01/2027 | | | ISO esperado `2027-01-01` | |
| Tentou enviar data vazia | | | `required` impede submissão e navegador apresenta validação | |
| Navegou com teclado | | | Campo recebe foco na ordem lógica, foco visível | |
| Abriu/operou calendário nativo | | | Resultado deve ser anotado por navegador; automação não valida o popup do navegador | |
| Avaliou clareza | | | Opinião do participante; sem expectativa presumida | |

**Citação literal sobre o significado que percebeu:**

>

**A legenda foi suficiente?** Sim / em parte / não / não sei.

**Dificuldades e etapas não concluídas:**


## Síntese após sessões

Não combinar relatos como percentagem sem registrar o número de sessões e o método. Separar erros de interpretação, hesitação, dificuldades de teclado e falhas técnicas. Uma sessão não prova compreensão geral; decisões sobre substituir ou manter controles nativos devem considerar diversidade de navegadores e usuários.
