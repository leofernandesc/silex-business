# Silex Business — ERP de gestão empresarial

**Status:** projeto em desenvolvimento e validação, com foco em uma solução B2B de gestão para pequenas e médias empresas. O repositório reúne a aplicação, testes e registros das decisões técnicas; ele **não representa, por si só, um SaaS já lançado ou homologado para dados reais**.

## Problema e proposta

Centralizar fluxos de cadastro, estoque, vendas, caixa e controle financeiro em uma aplicação integrada, facilitando a organização da operação de uma empresa.

Este protótipo possui uma instância de empresa por instalação. Funcionalidades multiempresa, assinatura comercial e implantação de produção não devem ser inferidas do código atual.

## Desenvolvimento assistido por IA

Agentes e ferramentas de IA apoiaram as iterações de desenvolvimento, incluindo planejamento de incrementos, implementação, revisão, testes e documentação. **A IA é parte do processo de construção deste software, não uma funcionalidade conversacional anunciada para o usuário final.** As decisões de produto e a aceitação dos resultados dependem de validação humana e dos testes do projeto.

A documentação de [desenvolvimento](docs/development/WORKFLOW.md), [validação](docs/VALIDACAO.md), [piloto](docs/pilot/PLANO.md) e [preparação de deploy](docs/deployment/RAILWAY.md) detalha escopo e limitações. Preparação de deploy não equivale a implantação concluída.

## Executar localmente com dados fictícios

```bash
git clone https://github.com/leofernandesc/silex-business.git
cd silex-business
make setup
make seed-demo
make build
make run
```

Abra `http://127.0.0.1:8000`. Requer Python 3.12+, Node.js 22.12+ e npm. Use apenas dados fictícios no ambiente de demonstração.

## Funcionalidades documentadas

As Sprints 8–18 estão implementadas: livro caixa, cadastros financeiros, títulos e baixas, OFX local, dashboard, 26 relatórios, orçamento, Diaristas/Frete com PIX, interface revisada e serviços/pedidos com apuração financeira. Migrações vão até `0010`. No serviço, custo contratado não é pagamento: a geração de títulos é manual, única e não altera saldos até a baixa. Veja [revisão financeira](docs/FINANCEIRO_REVIEW.md), [plano](docs/PLANO_FIDELIDADE_CONTROLMAX.md) e [validação](docs/VALIDACAO.md). O comportamento interno do sistema original sem evidência segue desconhecido; consulte os documentos de piloto e deploy para conhecer o estado atual de publicação.

Para abrir a versão já compilada:

```bash
make run
```

Acesse `http://127.0.0.1:8000`. Para atualizar outra cópia já instalada: pare a aplicação, execute `make backup-bundle`, `make migrate`, `make build` e `make run`.

## Pré-requisitos

- Python 3.12+ com `venv` e `pip`.
- Node.js 22.12+ e npm; também compatível com Node 26 usado nesta implementação.
- Make. Dependências Python ficam em `.venv/`; dependências frontend em `frontend/node_modules/`.
- Sem Docker, banco externo, serviço pago, conta de hospedagem ou programa instalado globalmente pelo setup.

Dependências estão fixadas em `backend/requirements.txt` e `frontend/package-lock.json`. Referências oficiais: [Vite](https://vite.dev/guide/), [FastAPI](https://fastapi.tiangolo.com/tutorial/security/), [SQLAlchemy e SQLite](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html).

## O que está disponível

- Login com sessão persistente de 12 horas, logout, perfis e gestão de usuários.
- Clientes, produtos e serviços, busca, filtros, paginação, edição e desativação.
- Fornecedores, Diaristas e Frete Subcontratado: contato/documento, PIX com tipo/chave/titular, observações, busca, edição e inativação; seleção em Contas a Pagar.
- Serviços e pedidos: cliente, descrição, data, valor negociado, custos contratados de diaristas e frete, valores previstos/realizados e geração explícita de títulos a pagar/receber.
- Saldo inicial, entradas, saídas e inventário com motivo, usuário e horário.
- Caixa individual: abertura, dinheiro esperado, valor contado, fechamento e diferença.
- Vendas em rascunho, finalização com desconto, quantidades fracionadas, dinheiro, Pix, cartão ou venda a prazo com um vencimento.
- Financeiro nas nove abas: livro caixa efetivo, dashboard, conciliação, contas a pagar/receber, contas, categorias, subcategorias e relatórios.
- Livro caixa com períodos rápidos, filtros aplicados ao pesquisar, datas de lançamento/competência, documento, fornecedor, saldos atuais, paginação, CSV e impressão.
- Contas com saldo inicial/referência, dados bancários e taxas; categorias, subcategorias e fornecedores com edição e inativação.
- Títulos com cliente/fornecedor, documento, competência e recorrência finita; recorrência repete o valor integral e criar o título não altera o saldo.
- Quitação integral/parcial com principal, juros, multa e desconto discriminados, histórico idempotente e estorno com motivo.
- Na baixa por PIX, dados atuais do beneficiário e cópia da chave; copiar não executa transferência nem registra pagamento.
- Comprovantes PDF, imagem, DOC e DOCX, até três por título ou baixa e 5 MB cada.
- Importação local de OFX com prévia, duplicados e sugestões; cada baixa, novo movimento ou descarte precisa de confirmação manual.
- Dashboard financeiro, catálogo de 26 relatórios, CSV e orçamento mensal por categoria/subcategoria.
- Dashboard derivado dos registros, CSV respeitando filtros, recibo não fiscal e histórico de operações.
- Backup SQLite consistente ou ZIP completo com cópias dos comprovantes e manifesto; migrações e testes automatizados.

## Fluxo de avaliação

1. Entre como administrador e consulte os dados fictícios da demonstração.
2. Crie um produto e lance sua entrada em **Estoque**.
3. A demonstração já abre um caixa do administrador. Para outro usuário, abra o caixa em **Controle de caixa**.
4. Monte uma venda em **Frente de Caixa**. Dinheiro altera o saldo da gaveta; Pix e cartão vão para a conta digital.
5. Para vender a prazo, selecione um cliente e um vencimento. Em **Financeiro → Contas a Receber**, registre baixas parciais ou integrais; encargos e descontos são informados pelo usuário.
6. Consulte **Vendas** para imprimir recibo ou cancelar. Cancelamento de venda finalizada exige administrador e caixa da venda aberto.
7. Em **Conciliação Bancária**, selecione uma conta e importe um arquivo OFX de teste. Confira duplicados e confirme manualmente cada movimento.
8. Em **Dashboard** e **Relatórios Financeiros**, confira os indicadores, gere um CSV e cadastre uma meta mensal.
9. Feche o caixa informando o dinheiro contado. O valor esperado e a diferença ficam preservados.
10. Em **Movimentações → Serviços e pedidos**, registre a receita negociada e os custos combinados; use **Gerar títulos** somente quando quiser criar as obrigações. Pagar ou receber continuam sendo ações separadas.

## Comandos

| Comando | Ação |
| --- | --- |
| `make setup` | Cria venv, instala dependências do projeto e aplica migrações |
| `make migrate` | Aplica migrações pendentes |
| `make create-admin` | Cria administrador com senha digitada em prompt protegido |
| `make seed-demo` | Carrega demonstração num banco sem cadastros/vendas; repetição não duplica dados |
| `make dev` | API em 8000 e Vite em 5173; Ctrl+C encerra os dois processos |
| `make test` | Testes backend e unitários frontend, sem alterar banco da demonstração |
| `make build` | Verificação TypeScript e compilação frontend |
| `make test-e2e` | Compila e testa no Firefox; banco temporário e porta 8011 exclusiva |
| `make check-clean` | Reproduz setup, seed, build e testes numa cópia temporária limpa |
| `make run` | Serve aplicação compilada e API em 127.0.0.1:8000; Ctrl+C encerra |
| `make backup` | Cria snapshot consistente em `backups/` |
| `make backup OUTPUT=/caminho/novo.sqlite3` | Backup para arquivo novo escolhido |
| `make backup-bundle` | Cria ZIP com banco, comprovantes e manifesto CSV |
| `make backup-bundle OUTPUT=/caminho/novo.zip` | Pacote completo em um caminho novo |

`make test-e2e` usa um Firefox do Playwright já disponível no cache ou `GESTAO_FIREFOX_PATH=/caminho/firefox`. Não baixa navegadores automaticamente. Se não houver um, configure um Firefox compatível do Playwright. Veja [validação](docs/VALIDACAO.md).

## Dados, backup e restauração

O banco padrão está em `data/gestao.sqlite3`. Para outro banco, defina `GESTAO_DATABASE_URL=sqlite:////caminho/absoluto/banco.sqlite3`. O diretório desse arquivo deve existir. Não aponte para bancos de outros projetos.

Backup usa a API de backup do SQLite, incluindo gravações no WAL, e verifica integridade. O pacote ZIP também inclui uma cópia separada de cada comprovante e manifesto, além dos BLOBs já presentes no banco. Nenhum comando sobrescreve arquivo existente. Backups contêm cadastros, hashes de senha, sessões e comprovantes: mantenha-os privados.

Para restaurar:

1. Pare `make run` / `make dev` e confirme que nenhum processo usa o banco.
2. Faça um backup do estado atual e mova **juntos** `gestao.sqlite3`, `gestao.sqlite3-wal` e `gestao.sqlite3-shm` (se existirem) para um diretório de preservação.
3. Copie o backup escolhido para `data/gestao.sqlite3`. Não misture arquivos WAL antigos com o banco restaurado.
4. Execute `make migrate`, reinicie a aplicação e confira os registros. O backup preserva sessões; saia e entre novamente durante a conferência.

## Estrutura

```text
backend/app/          API, modelos, regras, sessões e CLI
backend/migrations/   Migrações Alembic
backend/tests/        Testes de integração, concorrência e backup
frontend/src/         React, TypeScript, interface e testes de precisão
frontend/tests/       Fluxos de navegador em três tamanhos
scripts/              Desenvolvimento e servidor isolado de teste
docs/                 Sprints, arquitetura, evidências e validação
```

## Escopo e evidências

Este MVP é para avaliação **local com dados fictícios**. Não emite NF-e/NFC-e, não integra TEF ou serviços de banco; OFX é uma importação de arquivo com confirmação manual. Recorrência cria títulos de mesmo valor em períodos separados, sem parcelamento automático. O sistema não é uma entrega de produção em rede. SQLite, cookies locais sem HTTPS e contas públicas da demonstração pertencem a esse escopo.

Consulte [sprints](docs/SPRINTS.md), [arquitetura e regras](docs/ARQUITETURA.md), [roteiro de revisão financeira](docs/FINANCEIRO_REVIEW.md), [análise do sistema de referência](docs/ANALISE_REA.md) e [resultado dos testes](docs/VALIDACAO.md). As telas da referência permanecem privadas em `docs/evidence/reference/`, excluídas do Git. Credenciais e captura sensível foram excluídas dos artefatos.
