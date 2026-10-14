# Sprint 8 — Livro caixa e base financeira

Registro histórico do incremento da Sprint 8. As capturas dessa pasta são regeneradas pela regressão e refletem a interface corrente; o manifesto registra a atualização das imagens separadamente dos resultados históricos. As Sprints 9–13 foram implementadas depois; para o estado atual, consulte [FINANCEIRO_REVIEW.md](FINANCEIRO_REVIEW.md) e [VALIDACAO.md](VALIDACAO.md).

## Estado da entrega

**Implementação e revisão técnica concluídas. Review de negócio preparada, ainda não realizada com o usuário.**

A Sprint 8 foi o primeiro incremento da ampliação financeira. As Sprints 1–7 do MVP já estavam implementadas. O usuário depois solicitou implementar todas as sprints restantes no mesmo ciclo. Esta entrega usa os prints fornecidos e regras convencionais autorizadas pelo usuário; não confirma regras internas do ControlMax.

## Incremento disponível

| História | Entrega |
| --- | --- |
| S8-01 | Nove abas no submenu Financeiro; conciliação e relatórios completos identificam etapas futuras |
| S8-02 | Livro caixa com despesas/receitas pagas imediatamente, histórico, documento, conta, subcategoria, fornecedor e competência |
| S8-03 | Sete períodos rápidos; busca por histórico/documento; tipo, conta, origem, comprovante e base de data; campos aplicados em Pesquisar |
| S8-04 | Cards de todo o filtro, chips de saldo atual, paginação padrão 20, estado vazio, CSV e impressão de todas as páginas |
| S8-05 | Contas com saldo inicial e referência/dados bancários/taxas; categorias/classificação/grupo; subcategorias/incidência; fornecedores simples; edição e inativação |
| S8-06 | Migração 0003 e backup; operações atômicas, chave de pedido para duplicação e estorno preservando original; testes e capturas |

As contas a pagar/receber mantêm o cadastro e a quitação integral do MVP. A ampliação dos títulos começa na Sprint 9. Dashboard financeiro apresenta o resumo básico disponível; gráficos e indicadores ficam para a Sprint 12. Relatórios oferece exportação de títulos e acesso ao CSV do livro caixa; catálogo completo fica para as Sprints 12–13. Comprovantes ainda não têm upload; o filtro indica a Sprint 10. Juros e multa ficam cadastrados, sem aplicação automática nesta etapa.

## Regras verificadas

- Saldo atual = saldo inicial da conta + pagamentos assinados de todo o histórico. O fundo de troco do turno não é receita nem saldo inicial dessa conta.
- Saldo inicial não entra nos cards do período. Título aberto não entra no livro caixa.
- Conta bancária aceita datas até hoje, a partir da referência do saldo inicial; dinheiro exige hoje e caixa aberto. Competência é separada.
- Cards usam todos os registros filtrados, incluindo páginas posteriores e estornos. Chips de saldo atual não dependem do período.
- Pesquisar aplica os campos; atalhos de período e conta aplicam somente essas escolhas aos filtros vigentes.
- Estorno mantém o original e insere movimento oposto, com lançamento hoje e competência original. Repetir estorno não duplica.
- Caixa fechado e saldo insuficiente impedem operações incompatíveis; falha reverte o título e o pagamento na mesma transação.
- Conta/categoria/subcategoria/fornecedor inativos continuam no histórico, mas não são aceitos em novos lançamentos. Vendas automáticas também verificam categoria e subcategoria.
- Cadastros com histórico protegem tipo/saldo inicial/referência da conta, direção da categoria e vínculo da subcategoria.
- Financeiro é administrativo no menu e na API; operador recebe 403.

## Evidência técnica

| Verificação | Resultado |
| --- | --- |
| Backend, conjunto final | 43 testes passaram |
| Frontend unitário | 15 testes passaram |
| TypeScript e Vite | Compilação concluída |
| Navegador, conjunto completo | 18 cenários passaram: seis casos em 1440, 768 e 375 px |
| Migração de legado | IDs, valores, relações e datas Manaus preservados; integridade e chaves estrangeiras válidas |
| Migração local | Revisão 0003; todos os campos anteriores comparados com o backup e preservados; soma dos pagamentos continua 7.550 centavos |
| Alembic check | Nenhuma operação de migração pendente |
| Revisão técnica | Conferência de transações, permissões, estorno, inativação, filtros, migração e capturas; executada nesta sessão, sem revisor externo |

A validação encontrou e corrigiu o uso de categoria/subcategoria inativa nas vendas automáticas; o backend final passou após a correção. Os fluxos de venda, título e prazo também receberam uma execução direcionada de regressão desktop depois desse ajuste. Impressão foi verificada no navegador com mídia de impressão; não houve teste de impressora física.

Os testes usam bancos temporários. O banco local manteve 2 usuários, 2 clientes, 5 itens, 3 vendas, 5 títulos e 2 pagamentos. Snapshot anterior à migração: `backups/pre-sprint8.sqlite3`. Dependências e lockfiles permanecem os existentes; nenhum programa foi instalado nesta sprint.

## Capturas para a Review

| Tela | Desktop | Tablet | Celular |
| --- | --- | --- | --- |
| Livro caixa filtrado | [1440 px](evidence/sprint8/livro-caixa-desktop.png) | [768 px](evidence/sprint8/livro-caixa-tablet.png) | [375 px](evidence/sprint8/livro-caixa-mobile.png) |
| Nenhum movimento | [Desktop](evidence/sprint8/livro-caixa-vazio-desktop.png) | [Tablet](evidence/sprint8/livro-caixa-vazio-tablet.png) | [Celular](evidence/sprint8/livro-caixa-vazio-mobile.png) |

Capturas inspecionadas em desktop e celular. Tabelas e atalhos têm rolagem interna; a página não apresentou transbordamento horizontal nos cenários executados. [Manifesto de hashes](evidence/sprint8/manifest.json).

## Abrir a demonstração

```bash
cd /home/leofernandesc/controlmax-inspired
make run
```

Abra **http://127.0.0.1:8000**. Administrador fictício: `demo.admin`, senha `DemoLocal#2026`. A aplicação é local; pare com Ctrl+C.

## Roteiro manual de Review — pendente

1. Entre como administrador. Abra as nove abas do Financeiro e confira os avisos das próximas etapas.
2. Em Cadastro de Contas, crie uma conta bancária fictícia com saldo inicial R$100 e referência de hoje. Confirme que o chip mostra R$100, sem gerar receita do período.
3. Crie categoria, subcategoria e um fornecedor pelo botão Fornecedores do Cadastro de Contas.
4. No livro caixa, crie uma receita de R$25 na conta nova. Saldo esperado: R$125; receita do período nessa conta: R$25. Crie despesa de R$10; saldo esperado R$115 e saldo do período R$15.
5. Digite um histórico inexistente e confira que a tabela só muda após Pesquisar. Confira Documento, Origem, base Competência, período vazio, CSV e prévia de impressão.
6. Estorne a despesa de R$10: saldo retorna a R$125. O original continua visível junto ao estorno. Inative um cadastro e confira que o histórico permanece.
7. Crie um título pendente em Contas a Receber e confirme que não altera o saldo até Quitar. Confira também acesso de operador sem Financeiro.
8. Registre diferenças desejadas de rótulos, organização e regras. Encerrar a Review de negócio depende desse retorno; os testes automáticos não equivalem a essa aprovação.

Como o usuário informou não operar o original, esta Review pode validar a clareza e coerência da demonstração com os prints. Questões de comportamento específico continuam como premissas até haver nova evidência.

## Próximo incremento

Sprint 9: ampliar títulos separados de contas a pagar e receber, fornecedor/cliente, documentos, competência e recorrência finita que repete o valor integral. Esta sprint não foi iniciada.
