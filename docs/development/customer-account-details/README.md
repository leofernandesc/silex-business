# Clientes: dados restritos à conta autorizada

Base: `18833b7886f38e64a371c62da99e7bd6832fd95b`. Alteração restrita a Clientes; a Silex Business continua multissetorial. Classificação do workflow: nível 3, por envolver migração e autorização por identidade.

## Implementação

- A sessão existente resolve o usuário no banco a cada chamada. Somente o username **exato** `sammya.admin`, com perfil `admin` e conta ativa, pode ler/gravar os dados especiais. Nome de exibição, cabeçalhos, parâmetros e IDs enviados pelo navegador não concedem acesso. Não há nova permissão global nem criação automática dessa conta.
- A migração aditiva **0011**, após 0010, cria somente `customer_service_details`. Chaves estrangeiras para cliente e usuário, unicidade do par e restrição SQL de tipo. Nenhuma coluna, linha ou regra de `customers` é modificada pela migração.
- Endereços inicial/final: textos opcionais de até 2.000 caracteres, independentes dos endereços cadastrais. Tipo opcional: `local` → Local; `interstate` → Interestadual; `null` → Não informado.
- POST/PUT de Clientes aceitam a extensão opcional `service_details`. As três propriedades são `start_address`, `end_address`, `service_type`. O corpo não aceita proprietário. Cliente e extensão são salvos na mesma transação: falha de validação/autorização não produz gravação parcial.
- Outras contas recebem 403 ao enviar a extensão válida, inclusive vazia/null. Campos desconhecidos ou valores fora do enum são recusados com 422. As respostas comuns dessas contas omitem integralmente a extensão. As consultas autorizadas buscam somente os dados associados ao próprio ID, em lote por página.
- Omitir `service_details` ou enviar null preserva os dados existentes; omitir propriedades dentro do objeto também preserva essas propriedades. Limpeza exige endereço explicitamente vazio ou tipo explicitamente null. A ausência de registro complementar aparece vazia para a conta autorizada.
- O formulário usa o usuário autenticado para apresentar a seção “Dados do serviço”; o backend é a autoridade. Novo/Editar reutilizam os controles e o gerenciamento de foco existentes. As opções incluem “Não informado”, pois todos os campos são opcionais.
- Se a conta for renomeada, desativada ou deixar de ser administradora, o acesso cessa. Outra conta posteriormente criada com o mesmo username não herda os dados: eles permanecem ligados ao ID original.

## Correção global da listagem

A coluna **Contato / cidade** apresenta o contato ou, na ausência, cidade/UF ou “—”. A cidade/UF continua visível quando há contato; telefone e e-mail são apresentados uma única vez na linha complementar. Os dados armazenados, busca, paginação, CSV e demais módulos permanecem com os contratos anteriores.

## Arquivos

- `backend/app/api.py`, `models.py`, `schemas.py`: autorização, serialização condicional, transação e estrutura da extensão.
- `backend/migrations/versions/0011_customer_service_details.py`: criação aditiva da tabela complementar.
- `frontend/src/catalog.tsx`, `types.ts`, `App.tsx`: seção exclusiva, tipos e usuário autenticado fornecido a Clientes; correção global do telefone.
- `backend/tests/test_customer_details.py`, `frontend/tests/customer-details.spec.ts`: testes específicos em fixtures descartáveis.
- `scripts/check_railway.py`: retirar revisão de migração fixa somente da fixture de teste local.
- Este documento: decisão técnica, validação e cautelas operacionais.

## Validação

Dados e contas inteiramente fictícios, banco SQLite temporário.

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Clientes, autorização e regressão existente | `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_customer_details.py backend/tests/test_app.py -q` | 59 aprovados (24 novos); inclui contratos comuns, vendas, financeiro, CSV, backup e sessão |
| Segurança e prontidão da instância | `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_deployment.py -q` | 38 aprovados |
| Frontend | `cd frontend && npm test` | 133 aprovados |
| TypeScript/Vite | `cd frontend && npm run build` | Aprovado |
| Formulário e listagem reais | `cd frontend && npx playwright test tests/customer-details.spec.ts --project=desktop --project=mobile` | 10 aprovados em Firefox, 1440 × 900 e 375 × 812 |
| Regressão de cadastro/venda | `cd frontend && npx playwright test tests/app.spec.ts --project=desktop --grep 'cliente e produto persistem'` | 1 aprovado: clientes/produtos, estoque, venda, recibo e estorno |
| Volume e migração em runtime local | `.venv/bin/python scripts/check_railway.py --build` | Build, ausência de seed, reinício/container novo, backup/anexos, saúde e falhas de migração aprovados; recursos Docker descartáveis, portas em loopback |
| Diff | `git diff --check` | Aprovado |

A migração 0010 → 0011 foi executada em fixture contendo cliente anterior: definições e linhas de **todas** as tabelas anteriores foram comparadas e preservadas, exceto a revisão Alembic esperadamente atualizada. Um segundo upgrade foi idempotente; integridade SQLite/FKs aprovadas. O teste específico de clientes/CSV foi repetido após acrescentar casos de campos opcionais, com aprovação. Reabertura da aplicação com engine novo e restauração do backup confirmaram os três campos persistidos. As exportações de Clientes antes/depois dos dados especiais foram idênticas byte a byte.

A primeira coleta de navegador teve 9 aprovações e um timeout visual enquanto o POST de login continuava pendente. O coletor novo passou a aguardar e exigir HTTP 200 desse POST antes de verificar a tela; a execução final teve 10/10 sem retries ou mudança em autenticação. O aviso preexistente de depreciação TestClient/httpx permanece. Não foram executadas as matrizes completas do ERP ou homologações humanas/assistivas.

O baseline de código foi arquivado fora do projeto, com acesso restrito e SHA-256; a extração em diretório temporário conferiu os 580 arquivos. Esse snapshot de fontes não é backup do banco Railway. Capturas de desktop/celular são produzidas pelo teste de navegador como artefatos locais ignorados pelo Git; a inspeção móvel confirmou rótulos, foco, campos inteiros e ausência de excesso horizontal do documento.

## Migração e eventual Railway

**Este PR não autoriza deploy. Nenhuma conta, banco ou recurso Railway foi acessado/modificado.**

Antes de qualquer deploy futuro, exigir backup verificável e exportado do SQLite atual (incluindo anexos BLOB), sem gravações concorrentes durante a janela de mudança. Seguir o [guia operacional Railway](../../deployment/RAILWAY.md#13-backup-e-recuperação): executar a CLI dentro do container com volume montado, conferir integridade/hash e manter cópia privada fora do provedor. Não enviar o banco local, não executar seed-demo e não provisionar credenciais padrão.

O start existente aplica Alembic após montar o volume e mantém uma única instância. A 0011 apenas cria uma tabela vazia; não preenche clientes anteriores nem usuários. Após autorização de publicação, validar saúde, revisão 0011, clientes anteriores e login com contas individuais existentes. A migração e a nova tabela foram verificadas somente em ambientes descartáveis locais.

Rollback deve ser supervisionado e precedido de novo backup: o downgrade 0011 remove a tabela complementar e perderia os novos dados. Não executá-lo automaticamente. Retornar a uma imagem 0010 requer restaurar um snapshot compatível, com decisão explícita sobre eventuais registros posteriores. Restaurar o snapshot completo também reverte dados comuns e sessões; não substituir o banco ativo sem autorização.

Um instrumento local de regressão (`scripts/check_railway.py`) restaurava a revisão fixa 0010 após simular corrupção. Ele passa a restaurar a revisão capturada na própria fixture, permitindo testar corretamente a recusa de contas demo após novas migrações. Não altera a inicialização do produto.

Homologação humana/assistiva e teste com dados reais não foram realizados. Não há multitenancy, novos módulos ou alterações financeiras nesta entrega.
