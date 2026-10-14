# Validação da entrega local

## Sprints 15–18 — incremento concluído

Interface e menu foram aproximados das capturas fornecidas: grupos recolhíveis, cabeçalho compacto, paleta clara, identidade provisória configurável e nomes de ação/tela ajustados. O financeiro agora fixa a direção de Contas a Pagar/Receber, aplica filtros antes de mostrar lista e cards, mantém totais além da paginação e usa a mesma consulta filtrada em CSV e impressão. A fronteira de “vence em 7 dias” inclui hoje e hoje + 7; o teste também cobre o oitavo dia e saldo parcial.

A Sprint 17 separa campos de contato/endereço, adiciona busca por campo e grupo/filtro no catálogo. A Sprint 18 associa diaristas e frete ao serviço/pedido, apresenta resultado previsto/realizado, permite geração manual e idempotente de títulos e cancela sem apagar histórico. Valor padrão é apenas sugestão editável; gerar título não paga nem altera saldo.

- `make test`: **69 testes backend** e **15 unitários frontend** passaram.
- `make build`: TypeScript e Vite passaram. `alembic check`: nenhuma alteração de modelo pendente.
- `npm run test:e2e`: **27/27 cenários passaram** (nove fluxos em desktop 1440, tablet 768 e celular 375), incluindo a regressão de Sprints 8–14 e a jornada nova de serviço/pedido.
- Jornada de serviço/pedido: criação, atualização da sugestão de diária, preservação do valor acordado, geração e associação de 1 recebível + 2 contas a pagar passaram nos três tamanhos. As capturas estão em [evidence/service-orders/](evidence/service-orders/).
- Migrações 0008–0010 aplicadas no banco local após backup privado [pre-sprint15-18.sqlite3](../backups/pre-sprint15-18.sqlite3), permissão 0600. A revisão avançou de 0007 para 0010.
- As 20 tabelas de negócio anteriores e todos os seus campos/IDs/valores foram comparados ao backup e permanecem iguais. A base manteve 2 usuários, 2 clientes, 5 produtos, 3 vendas, 5 lançamentos financeiros, 2 baixas e 0 prestadores. Integridade SQLite `ok`, nenhuma violação FK; as quatro novas tabelas ainda estão vazias.
- O setup limpo não foi repetido: esta entrega não adicionou nem instalou dependências. Nenhuma publicação ou configuração de rede foi realizada; Sprint 19 permanece planejada.

Uma limitação de modelagem fica explícita: as duas colunas que associam títulos aos pedidos não têm FK SQLite para evitar reconstruir `finance_entries`, já referenciada por pagamentos, anexos e conciliações. A API valida esses vínculos; índices impedem títulos duplicados por custo e não há exclusão física de pedidos. Ver [arquitetura](ARQUITETURA.md).

Manifesto de dimensões, hashes das capturas do serviço/pedido e hashes dos artefatos gerados: [manifesto do serviço/pedido](evidence/service-orders/manifest.json).

| Fluxo da Sprint 18 | Desktop | Tablet | Celular |
| --- | --- | --- | --- |
| Serviço/pedido, custos e títulos | [Captura](evidence/service-orders/orders-desktop.png) | [Captura](evidence/service-orders/orders-tablet.png) | [Captura](evidence/service-orders/orders-mobile.png) |

## Histórico — Sprint 14

Cadastros de **Diaristas** e **Frete Subcontratado**, PIX e beneficiários em Contas a Pagar implementados. Fornecedores agora aparece em Cadastros. Nome provisório Gestão aplicado à interface; rótulos de ambiente local/demonstração e mensagens de etapas futuras foram retirados dos fluxos. Redesign completo, refinamento financeiro e vínculo de custos ao serviço/pedido estão planejados em [PLANO_FIDELIDADE_CONTROLMAX.md](PLANO_FIDELIDADE_CONTROLMAX.md).

- **67 testes backend** e **15 testes unitários frontend** passaram.
- **24 cenários de navegador** passaram (oito fluxos em desktop, tablet e celular).
- Após corrigir a cor das mensagens de sucesso e o enquadramento das capturas, os três cenários dos novos cadastros foram repetidos e passaram.
- TypeScript e Vite concluíram a compilação.
- Migração local **0007** aplicada após backup em **backups/pre-sprint14.sqlite3**, permissão 0600.
- Todos os campos/registros anteriores de todas as tabelas de negócio foram comparados com o backup e preservados; integridade SQLite ok, nenhuma violação de chave estrangeira e Alembic sem alteração pendente.

Os novos testes cobrem os cinco tipos de chave, formatos inválidos, isolamento das listas por tipo, busca, documento duplicado, PIX opcional, permissões, criação/edição/inativação e preservação de obrigações. Cadastrar/copiar PIX não cria títulos nem movimentações; só a ação explícita de registrar baixa altera saldo. O PIX exibido é o atual do cadastro; o teste não confirma titularidade bancária.

No E2E, a API de clipboard foi substituída por uma função controlada para conferir o texto copiado e que nenhuma baixa ocorre ao copiar. Não foi verificado o clipboard do sistema operacional; falha no navegador oferece cópia manual pelo campo selecionável. Capturas usam somente dados fictícios do banco temporário. [Manifesto dos novos cadastros](evidence/partners/manifest.json).

| Tela | Desktop | Tablet | Celular |
| --- | --- | --- | --- |
| Diaristas | [Captura](evidence/partners/diaristas-desktop.png) | [Captura](evidence/partners/diaristas-tablet.png) | [Captura](evidence/partners/diaristas-mobile.png) |
| Frete Subcontratado | [Captura](evidence/partners/frete-desktop.png) | [Captura](evidence/partners/frete-tablet.png) | [Captura](evidence/partners/frete-mobile.png) |
| PIX na baixa | [Captura](evidence/partners/baixa-pix-desktop.png) | [Captura](evidence/partners/baixa-pix-tablet.png) | [Captura](evidence/partners/baixa-pix-mobile.png) |

O aviso de depreciação Starlette/TestClient/HTTPX continua presente, sem falhas. A revisão de negócio continua disponível no [roteiro financeiro](FINANCEIRO_REVIEW.md). O setup limpo completo não foi repetido nesta etapa; as dependências permaneceram iguais.

## Histórico das Sprints 9–13

Ampliação do Financeiro concluída: recorrência, baixas parciais, anexos, importação OFX com confirmação manual, dashboard, 26 relatórios, orçamento mensal e backup completo com anexos. **50 testes backend**, **15 testes unitários frontend** e **21 cenários de navegador** passaram. `make build` concluiu TypeScript e Vite.

Migrações locais 0004–0006 aplicadas após backup consistente. O banco está na revisão 0006; `integrity_check=ok`, nenhuma violação de chave estrangeira, os campos e registros existentes foram preservados e Alembic não detectou alterações de modelo pendentes. Backup anterior: `backups/pre-sprint9-13.sqlite3` (permissão 0600).

As capturas de dashboard, conciliação OFX e relatórios são regeneradas pela regressão E2E e agora refletem a interface da Sprint 14. Dimensões e SHA-256 atuais: [manifesto das evidências](evidence/sprint9-13/manifest.json).

| Visualização | Desktop | Tablet | Celular |
| --- | --- | --- | --- |
| Dashboard | [Captura](evidence/sprint9-13/dashboard-desktop.png) | [Captura](evidence/sprint9-13/dashboard-tablet.png) | [Captura](evidence/sprint9-13/dashboard-mobile.png) |
| Conciliação OFX | [Captura](evidence/sprint9-13/ofx-desktop.png) | [Captura](evidence/sprint9-13/ofx-tablet.png) | [Captura](evidence/sprint9-13/ofx-mobile.png) |
| Relatórios | [Captura](evidence/sprint9-13/reports-desktop.png) | [Captura](evidence/sprint9-13/reports-tablet.png) | [Captura](evidence/sprint9-13/reports-mobile.png) |

A revisão manual de negócio continua disponível em [FINANCEIRO_REVIEW.md](FINANCEIRO_REVIEW.md) para confirmar as premissas prováveis usadas nos cálculos. Os testes técnicos não dependem dessa revisão. A aplicação segue local e demonstrativa, sem publicação ou conexão bancária.

## Histórico anterior — MVP 0002

| Verificação | Resultado |
| --- | --- |
| `make test` — backend | 35 testes passaram |
| `make test` — frontend | 12 testes passaram |
| `make build` | TypeScript e Vite concluídos |
| `make test-e2e` | 15 fluxos passaram: cinco casos em 1440, 768 e 375 px |
| `make check-clean` | Setup, seed, build e testes passaram numa cópia temporária sem banco/dependências locais |
| Alembic `check` | Nenhuma alteração de modelo sem migração |
| Banco local | Revisão 0002; `integrity_check=ok`; nenhuma violação de chave estrangeira |
| `make backup` | Snapshot consistente criado; backup e leitura/restauração separados cobertos por teste |
| Seed repetido | Nenhuma alteração ou duplicação |
| Desenvolvimento | HTML e `/api/health` responderam 200 tanto em 8000 quanto no proxy 5173 |
| Evidências da referência | SHA-256 das oito imagens conferidos contra o manifesto original |

Backend: sessão, logout, expiração, revogação, permissões, origem externa, tentativas de login, cadastros únicos, desativação, preços preservados, estoque e inventário, serviços, venda a prazo, finalização/estorno/fechamento idempotentes, transação revertida por estoque insuficiente, concorrência de vendas, pagamentos, dinheiro sem saldo, atraso, CSV, precisão, fuso horário, motivos, backup e persistência.

Frontend: conversão exata de centavos e milésimos, arredondamento, valores inválidos, limites, BRL e Manaus. Navegador: sessão após recarregar, todas as telas, criação de cliente/produto, estoque, venda fracionada, recibo, estorno, quitação/exportação, perfil operador, abertura/fechamento com diferença, rascunho a prazo, Escape e salto por teclado para o conteúdo. Quantidade inválida no carrinho gera mensagem sem derrubar a interface. A navegação normal não fez requisições para serviços externos.

Modo de impressão do recibo verificado com `emulateMedia(print)`: recibo visível e navegação, carrinho e botões ocultos. Capturas foram inspecionadas visualmente. Não foi feito teste de impressora física nem geração de documento fiscal.

## Capturas do MVP

As imagens abaixo usam somente dados fictícios do banco temporário de teste. O banco da demonstração permaneceu com 2 usuários, 2 clientes, 5 itens e 3 vendas.

Dimensões, SHA-256 das 12 capturas e hashes dos artefatos compilados: [manifesto local](evidence/local/manifest.json).

| Visualização | Desktop | Tablet | Celular |
| --- | --- | --- | --- |
| Painel | [1440 px](evidence/local/dashboard-desktop.png) | [768 px](evidence/local/dashboard-tablet.png) | [375 px](evidence/local/dashboard-mobile.png) |
| Frente de venda | [Desktop](evidence/local/pdv-desktop.png) | [Tablet](evidence/local/pdv-tablet.png) | [Celular](evidence/local/pdv-mobile.png) |
| Recibo | [Desktop](evidence/local/recibo-desktop.png) | [Tablet](evidence/local/recibo-tablet.png) | [Celular](evidence/local/recibo-mobile.png) |
| Impressão | [Desktop](evidence/local/recibo-impressao-desktop.png) | [Tablet](evidence/local/recibo-impressao-tablet.png) | [Celular](evidence/local/recibo-impressao-mobile.png) |

Sem transbordamento horizontal da página nos fluxos testados. Tabelas extensas têm rolagem interna. Dialogs usam títulos associados e foco nativo. Isso cobre os casos descritos; não representa auditoria completa de acessibilidade.

## Ambiente verificado

- Python 3.12.3; Node 26.8.1; npm 11.19.0.
- FastAPI 0.143.0; SQLAlchemy 2.0.54; Alembic 1.20.0; Argon2 25.1.0.
- React 19.3.0; TypeScript 5.9.3; Vite 7.3.7; Vitest 4.1.11.
- Playwright 1.64.0 com Firefox já existente no cache local; nenhum navegador instalado pela implementação.
- Dependências do projeto instaladas em venv/node_modules. Lockfiles preservam as versões resolvidas.

O runner de backend emitiu um aviso de depreciação do TestClient/HTTPX da Starlette; os 35 testes concluíram normalmente. Os runners de navegador emitiram aviso de configuração de cores do terminal, sem falhas.

## Correções realizadas durante a validação

1. Associação explícita `label/htmlFor/id` nos formulários de seleção.
2. Commit da sessão e de gravações antes de enviar a resposta HTTP (`Depends(..., scope="function")`), eliminando a corrida observada após login.
3. Seletores de teste delimitados por registro, evitando ambiguidade entre dados de diferentes tamanhos de tela.
4. Salto para o conteúdo sem alterar a rota, nomes acessíveis de dialogs e tratamento de quantidade inválida ao adicionar novamente um item.
5. Layout de impressão sem a interface do pedido ocupando espaço no documento.

## Limites

Entrega validada para avaliação local com SQLite e dados fictícios. Sem publicação, operação em rede, integração fiscal, TEF ou conciliação bancária. Comportamento interno do ControlMax original permanece desconhecido; as regras testadas são as desta reconstrução. A revisão de negócio com o usuário é a próxima etapa e pode gerar histórias de ajustes.
