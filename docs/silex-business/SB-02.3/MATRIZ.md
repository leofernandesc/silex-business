# Matriz de acessibilidade e responsividade

23 telas operacionais mais Login × 3 larguras = 72 estados finais. As verificações de tipografia, controles, bordas, estados e tabelas foram comparadas à versão anterior ao SB-02.2. Todos os dados são fictícios.

| Tela | 1440 / 768 / 375 | Inter / nomes acessíveis | Diálogo | Pendências anteriores |
| --- | --- | --- | --- | --- |
| Login | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Visão geral | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Clientes | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Produtos ou Serviços | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Fornecedores | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Diaristas | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Frete Subcontratado | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Movimentações de estoque | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Frente de Caixa | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Vendas | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Serviços e pedidos | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Controle de caixa | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Lançamentos (Despesa/Receita) | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Dashboard financeiro | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Conciliação Bancária | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Contas a Pagar | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P02, P04 |
| Contas a Receber | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P02, P04 |
| Cadastro de Contas | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Categorias | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| SubCategorias | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Relatórios Financeiros | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Usuários | Sem overflow nas três | Passam nas três | Teclado/Escape passam; retorno P01 | P01, P04 |
| Histórico de operações | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |
| Empresa e identidade | Sem overflow nas três | Passam nas três | Sem modal de criação nesta captura | P04 |

## Detalhes por verificação

- 72/72 estados sem overflow horizontal da página; tabelas largas rolam dentro de seu container.
- 72/72 estados com Inter local 400/600 carregada, tipografia calculada consistente e zero controles visíveis sem nome acessível.
- 63 amostras de foco primário: todas com contraste final acima de 3:1 nas superfícies calculadas.
- 267 campos foram focados; seis amostras (Busca de Pagar/Receber × três larguras) não têm marcador, como no backup.
- 42 diálogos: foco inicial dentro, 12 Tabs contidos e Escape fechando; todos perderam retorno ao acionador antes/depois. O foco inicial de Clientes está em Fechar janela no baseline e no candidato.
- 23 tabelas com overflow foram exercitadas; 22 deslocaram na leitura inicial de 180 ms. Categorias foi repetida com 500 ms e duas setas; chegou ao limite de rolagem em ambas as versões. Esse primeiro resultado foi de amostragem, não uma regressão demonstrada.
- Menu em 768/375 abre/fecha e o conteúdo cabe por rolagem; gestão de foco ainda tem a pendência P03.
- Estados busy/disabled, vazio, erro simulado e sucesso possuem capturas e verificações nos testes adicionais.
- Receitas/despesas e status mantêm texto/sinal/ações; suas cores não foram substituídas pelo azul institucional.

A tabela resume a cobertura; o JSON/CSV possui uma linha por tela e largura, com nome real do heading, métricas, campos, tabelas e link de captura. As capturas de diálogos após navegação por Tab podem mostrar o trecho inferior do formulário, comprovando acesso aos botões. Não devem ser interpretadas como formulários cortados.
