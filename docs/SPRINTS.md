# Backlog e entrega por sprint

Planejamento de referência: sprints de uma semana, implementadas na ordem abaixo. A duração é uma sugestão de organização; os incrementos deste checkout foram produzidos na sessão de implementação, não durante sete semanas de calendário.

Quadro: **A fazer → Em andamento → Em validação → Concluído**. Para novos ciclos: Planning para selecionar histórias; execução e registro de impedimentos; Review com dados fictícios; Retrospectiva e replanejamento do restante.

Os incrementos das sprints 1–18 estão implementados e validados tecnicamente neste checkout. A Review de negócio permanece disponível para o usuário; não foi presumida aprovação para uso com dados reais.

O ciclo das Sprints 14–18 está implementado: cadastros e PIX, atualização visual e navegação, filtros e totais financeiros, endereços/catálogo e serviços/pedidos com apuração de custos. A Sprint 19 permanece planejada para hospedagem e operação em rede. O usuário confirmou os beneficiários em Contas a Pagar e os custos vinculados ao serviço/pedido.

## Sprint 0 — Descoberta

- S0-01: identificar telas, scripts e limites do original.
- S0-02: acordar um MVP local, não fiscal, com marca própria e dados fictícios.
- Evidência: `docs/ANALISE_REA.md` e `docs/evidence/manifest.json`; imagens privadas disponíveis nesta máquina.

## Sprint 1 — Base e autenticação

- S1-01: React/TypeScript, FastAPI, SQLite e migração inicial.
- S1-02: login/logout, Argon2, sessão persistente e autorização no backend.
- S1-03: criação de administrador, usuários operadores, layout e comandos Make.
- Aceite: sessão após recarregar; operador recebe 403 nas APIs administrativas; aplicação compilada servida localmente.

## Sprint 2 — Cadastros

- S2-01: clientes com documento opcional, contato, endereço e situação.
- S2-02: produtos/serviços, código único, preço, unidade e código de barras opcional.
- S2-03: buscas, filtros, paginação e seed idempotente fictício.
- Aceite: registros persistem, duplicações são rejeitadas, desativação preserva histórico, preços anteriores da venda não mudam com o catálogo.

## Sprint 3 — Estoque

- S3-01: saldo inicial, entrada, saída e inventário.
- S3-02: histórico com motivo, responsável e horário; filtros e exportação.
- Aceite: serviços não movem estoque, saída insuficiente é rejeitada, saldo corresponde à soma dos movimentos, quantidade mantém três casas.

## Sprint 4 — Caixa e vendas imediatas

- S4-01: turno único por operador, abertura, fechamento e diferença.
- S4-02: carrinho, desconto, rascunho, dinheiro/Pix/cartão e recibo não fiscal.
- S4-03: finalização atômica/idempotente e cancelamento com estorno.
- Aceite: falha no segundo item reverte o primeiro; concorrência não vende o último saldo duas vezes; apenas dinheiro altera a gaveta; cancelamento exige condições do caixa.

## Sprint 5 — Financeiro e prazo

- S5-01: contas, categorias, receitas, despesas, a pagar e a receber.
- S5-02: prazo com cliente e um vencimento, atraso derivado e quitação integral.
- S5-03: pagamentos e estornos assinados, com vínculo a caixa para dinheiro.
- Aceite: repetição não duplica pagamento, parcelas/quitação parcial são rejeitadas, filtros e saldos derivam dos registros.

## Sprint 6 — Dashboard, relatórios e interface

- S6-01: resumo real das vendas, recebíveis e estoque; escopo por perfil.
- S6-02: CSV conforme filtros, recibo, português/BRL/Manaus.
- S6-03: menu móvel, formulários por teclado e tabelas com rolagem interna.
- Aceite: fluxos no navegador em 375/768/1440 px, sem transbordamento horizontal da página; sessão após reload; exportação e recibo acessíveis.

## Sprint 7 — Confiabilidade e entrega local

- S7-01: testes de integração, concorrência, precisão e idempotência.
- S7-02: backup consistente, restauração e migrações reproduzíveis.
- S7-03: instalação por lockfiles, documentação e evidência local.
- Aceite: `make test`, `make build`, `make test-e2e`, backup restaurado em banco separado e setup reproduzido.

## Definição de pronto

Uma história está concluída quando seu fluxo funciona, o critério de aceite foi verificado, os testes relevantes passam e a documentação necessária está atualizada. Resultados desta implementação estão em [VALIDACAO.md](VALIDACAO.md). Nenhum incremento foi publicado, enviado ao GitHub ou apresentado como sistema pronto para operação em rede.

## Ampliação do financeiro — Sprints 8–13

Escopo aprovado: as nove abas do Financeiro, prioridade em lançamentos/títulos e avaliação local. A pedido do usuário, as sprints 9–13 foram implementadas no mesmo incremento e verificadas em conjunto. Datas sugeridas de uma semana são organização, não semanas de calendário já realizadas.

| Sprint | Incremento | Estado |
| --- | --- | --- |
| 8 | Livro caixa, submenu, contas, categorias, subcategorias e fornecedores | Implementado; review técnica em `SPRINT8_REVIEW.md` |
| 9 | Títulos separados, documentos, competência, cliente/fornecedor e recorrência finita | Implementada e testada |
| 10 | Pagamentos parciais, juros/multa/desconto, estornos e anexos | Implementada e testada |
| 11 | OFX local: prévia, duplicados, correspondência e confirmação manual | Implementada e testada |
| 12 | Dashboard financeiro, indicadores e principais relatórios | Implementada e testada |
| 13 | Catálogo de 26 relatórios, orçamento mensal, exportações e entrega | Implementada e testada |

### Sprint 8 — Livro caixa e base financeira

- S8-01: nove entradas do submenu; telas futuras identificam a etapa prevista.
- S8-02: livro caixa efetivo com receita/despesa imediata, documento, conta, subcategoria, fornecedor e competência.
- S8-03: Hoje, Semana, Mês, Mês anterior, Ano, Tudo, Personalizado; pesquisa por histórico/documento; tipo/conta/origem/comprovante e base de data; Pesquisar aplica campos.
- S8-04: cards agregados em todo o filtro, chips de saldo atual independentes do período, página padrão 20, vazio, CSV e impressão.
- S8-05: contas completas, categorias e subcategorias, fornecedor simples; editar/inativar e preservar referências.
- S8-06: migração 0002 → 0003, backup, precisão em centavos, operação atômica, prevenção de duplicação, validação e evidências.
- Aceite técnico: lançamentos imediatos alteram o saldo uma vez; títulos abertos ficam fora do livro caixa; saldo inicial não é receita; estorno preserva o original; filtros, soma e paginação consistentes.
- Review: demonstração preparada; aprovação de negócio permanece pendente, sem presumir fidelidade das regras internas do original.

### Premissas implementadas

Recorrência repete o valor integral: três meses de R$100 geram três títulos de R$100. Criar título não movimenta saldo. Quitação futura separará principal, juros, multa e desconto; estornos serão preservados e repetição não duplicará pagamento. Anexos: até três arquivos por título/pagamento, 5 MB por arquivo, PDF/imagem/DOC/DOCX. OFX será importação local com prévia e confirmação; não é conexão bancária. Uso em BRL, português, Manaus e acesso financeiro administrativo. Não há provedor real de cobrança nesta fase.

As regras acima são escolhas desta implementação baseadas em respostas prováveis e telas fornecidas. Não são comprovação do comportamento interno da plataforma original. Emissão fiscal, dados reais ou disponibilização em rede exigem escopo próprio.

### Entrega das Sprints 9–13

- **Sprint 9:** títulos independentes do saldo; vínculo opcional a cliente ou fornecedor; documento e competência; recorrência limitada a 60 títulos diários, semanais, mensais ou anuais. Recorrências mensais ajustam dias inexistentes ao último dia do mês e repetem o valor integral.
- **Sprint 10:** baixa parcial ou integral com principal, juros, multa e desconto separados; chave de idempotência; estorno auditado com motivo e recomposição do saldo de principal; comprovantes privados no SQLite, três por título/baixa, 5 MB cada, PDF, imagens, DOC e DOCX.
- **Sprint 11:** parser local para OFX SGML/XML, limite de 10 MB e 10 mil transações; FITID repetido na mesma conta sinalizado; sugestão de título; baixa ou criação de movimento só após confirmação manual; linha pode ser ignorada com motivo.
- **Sprint 12:** indicadores do período, contas a pagar/receber em aberto e vencidas, saldos por conta, série mensal e resultado por classificação/grupo.
- **Sprint 13:** 26 relatórios catalogados com filtros e CSV; orçamento por mês/categoria/subcategoria comparado às despesas pagas por competência; `make backup-bundle` gera ZIP com snapshot SQLite, arquivos de comprovante e manifesto.

O roteiro de revisão visual/funcional está em [FINANCEIRO_REVIEW.md](FINANCEIRO_REVIEW.md). Capturas responsivas e hashes de evidência ficam em `evidence/sprint9-13/`.

## Sprints 14–18 — interface, financeiro e serviços

| Sprint | Incremento | Estado |
| --- | --- | --- |
| 14 | Diaristas, Frete Subcontratado, PIX e beneficiários em Contas a Pagar | Implementada e testada |
| 15 | Navegação recolhível, identidade provisória e layout claro/compacto | Implementada; revisada em três larguras |
| 16 | Filtros/totais coerentes, vencimentos, CSV e impressão financeira | Implementada e testada |
| 17 | Endereço estruturado, busca por campo, grupos de catálogo e referências de preço | Implementada e testada |
| 18 | Serviço/pedido, custos de prestadores, títulos vinculados e apuração | Implementada e testada |

Resumo dos comandos, revisão dos dados, capturas e hashes: [VALIDACAO.md](VALIDACAO.md). A etapa seguinte prevista é a Sprint 19; esta não foi iniciada.
