# P05 — Impressões financeiras pt-BR

Base aprovada: `bcab34796e4c06395686373144f01e7af20f00a8`. Branch: `fix/financial-print-ptbr`. Risco moderado. Correção de apresentação em três arquivos de produção, sem mudança de CSS ou dependências.

A restrição inicial de backend foi respeitada até a autorização adicional explícita do usuário: alterar somente a marca e apresentação da data no HTML de `finance_print`, com testes. Nenhuma outra parte do backend foi modificada.

## Diagnóstico e alteração

| Documento / origem | Responsável, dependências e contrato | Antes → depois |
|---|---|---|
| Livro caixa — Imprimir em Lançamentos | `frontend/src/ledger.tsx`; busca todas as páginas de `/api/finance/movements` com os filtros aplicados; datas `dateOnly`, dinheiro `money`, totais existentes; admin | `Livro caixa · Gestão` → `Livro caixa · Silex Business`. Datas já corretas; nenhum outro conteúdo alterado |
| Títulos — Imprimir em Pagar/Receber | `frontend/src/finance.tsx` abre `/api/finance/print`; `backend/app/api.py:finance_print` consulta `finance_query`/`finance_summary`; seis colunas e todas as linhas filtradas; admin | Cabeçalho Gestão → Silex Business; vencimento `2024-02-29` → `29/02/2024` |
| Recibo não fiscal — venda, PDV e detalhe na Visão Geral | `frontend/src/sales.tsx:SaleDetail`; dados de venda autorizados, `dateTime` em America/Manaus, `dateOnly`, `money`, `quantity` e `Badge`; acesso da venda mantido | Cabeçalho Gestão → Silex Business. Dias, horários, desconto e totais já corretos |
| 26 relatórios financeiros — Imprimir no relatório selecionado | `frontend/src/financePlanning.tsx:FinanceReports`; JSON paginado `/api/finance/reports/{slug}`, `formatReportValue`, `reportGroupDate`; admin | Datas textuais já brasileiras; sem alteração. Falha preexistente de visibilidade em mídia print registrada como IMP01 abaixo |
| Comprovantes anexados | Arquivos privados de títulos/baixas, servidos por `/api/finance/attachments/{id}`; conteúdo enviado pelo usuário | Não são templates gerados pelo ERP; não alterar nem remarcar documentos do usuário |
| Conciliação / Dashboard Financeiro | Não há impressão própria nessas telas; Dashboard oferece acesso ao livro caixa | Nenhum controle ou documento inventado |

A marca substituída era texto fixo do software. `company_name`, `brand_name`, identificação de clientes, contas e demais dados não foram alterados ou substituídos. Os três templates conservam a estrutura anterior. O HTML de títulos continua com os nomes técnicos de status existentes; esta autorização não inclui tradução desses estados.

A data do HTML é formatada diretamente do objeto civil `date`, com dia/mês/ano e quatro dígitos, sem parsing UTC, serialização ou conversão de fuso. Datas obrigatórias vazias/inválidas continuam rejeitadas pelo contrato existente; listagem vazia continua exibindo a mensagem anterior. Formatadores do frontend permanecem intactos.

## Validação

| Cobertura | Resultado |
|---|---|
| TypeScript e build Vite | `npm run build` aprovado (`tsc -b` + Vite) |
| Unitários frontend | 37 aprovados (`format` e `datePresentation`); 25 casos de data também aprovados em UTC e America/Sao_Paulo |
| Backend | 30 aprovados: 14 novos casos de impressão/validação/permissões + regressões `test_finance_expansion` e `test_financial_ledger`; os 14 novos também passaram em UTC e America/Sao_Paulo |
| Regressão E2E existente de livro caixa | 1 aprovada; apenas a expectativa da marca foi atualizada, mantendo verificações de filtros, CSV e linhas impressas |
| Comparação real de navegador | Firefox 155.0 pt-BR/Manaus e Chromium via Brave 155.1.97.57 en-US/UTC: 16 estados (4 documentos × 2 versões × 2 navegadores), sem erros de página |
| Contratos e integridade financeira | JSON de títulos, movimentos, contas, venda/detalhe, empresa e 26 relatórios equivalentes; linhas impressas preservam valores, sinais, centavos, IDs, dias e situações |
| Exportações | 30 CSVs idênticos byte a byte em cada navegador; cabeçalhos, BOM, separadores e formatos preservados |
| A4 / PDF | 8 PDFs gerados pelo Chromium; livro caixa e títulos em uma página, recibo com 24 itens em duas páginas. Texto selecionável, itens finais/desconto/total presentes, cabeçalho de tabela repetido no recibo |
| Diff / preservação | `git diff --check`; hashes dos demais arquivos rastreados e restauração do backup verificados |

A fixture contém somente dados fictícios, criada por APIs existentes e clonada antes das comparações: títulos em aberto/parcial/quitado, vencimentos em ano bissexto e virada de mês/ano, movimentos positivos/negativos, centavos, documentos vazios e recibo de 24 itens com descrição extensa. Os testes não usam banco persistente. O teste histórico foi executado depois da comparação, com uma linha extra apenas no banco descartável candidato.

No preparo inicial da fixture, as regras existentes rejeitaram datas anteriores à referência do saldo e pagamentos futuros; a configuração empresarial também precisou ser inicializada. O instrumento foi ajustado para uma conta sintética com referência em 2020 e pagamentos válidos passados. Nenhuma regra foi relaxada. Há um aviso preexistente de depreciação do TestClient/httpx; nenhuma dependência foi atualizada.

## Evidências essenciais

| Documento | Antes | Depois |
|---|---|---|
| Livro caixa | [Imagem](evidence/baseline-ledger.png) | [Imagem](evidence/candidate-ledger.png) |
| Títulos a pagar | [Imagem](evidence/baseline-expense.png) | [Imagem](evidence/candidate-expense.png) · [PDF A4](evidence/candidate-expense.pdf) |
| Recibo não fiscal | [Imagem](evidence/baseline-receipt.png) | [Imagem](evidence/candidate-receipt.png) · [PDF A4, duas páginas](evidence/candidate-receipt.pdf) |

[Resumo medido](evidence/validation.json). Logs completos, comparação de Receber, oito PDFs e demais capturas ficam localmente em `docs/evidence/financial-print-ptbr/`, sem banco ou credenciais no PR.

## Limitações e proposta separada

**IMP01, preexistente, gravidade alta:** com o Fluxo de caixa mensal carregado, `.finance-report-print` fica `display:none` em mídia print no baseline e na candidata. A regra global `main > :not(dialog)` do bloco de impressão prevalece; a tabela existe no DOM e na resposta, mas fica oculta. O contêiner é compartilhado pelos 26 relatórios. Não corrigido neste incremento. Proposta: override de impressão exclusivamente nesse contêiner, com revisão dos 26 formatos e testes A4 de tabela/paginação/recibo/livro caixa, sob autorização separada. Não há perda de dados da tela ou CSV.

Foram verificados mídia print, PDFs A4 do navegador e suas páginas rasterizadas. Não houve teste de impressora física, diálogo nativo de impressão do Firefox ou leitor de tela real. Nomes longos e cifras altas da fixture ficaram completos; não se promete cobertura de qualquer conteúdo arbitrário.

P05 **continua parcial**: saídas CSV dependem de decisão de destinatários/contratos ([inventário sem alterações](CSV.md)); homologação humana e assistiva permanece pendente. P07 e V01/T01 conservam os estados anteriores. Não há declaração de prontidão comercial.

## Reproduzir a comparação

Execute a partir da raiz do repositório na branch candidata. Requer dependências locais já instaladas, `.venv`, Firefox Playwright e Chromium/Brave existente. Nenhum pacote de sistema é instalado. Prepare a base em um diretório temporário; não utilize banco real:

```bash
export SILEX_PRINT_EVIDENCE="$(mktemp -d /tmp/silex-print-evidence-XXXXXX)"
export SILEX_TEST_PASSWORD='<senha da demonstração local documentada no README raiz>'
python3 - <<'PY'
from pathlib import Path
import os, subprocess, tempfile, tarfile, json
r=Path.cwd(); e=Path(os.environ['SILEX_PRINT_EVIDENCE'])
w=Path(tempfile.mkdtemp(prefix='silex-print-ptbr-')); p=w/'baseline'; p.mkdir()
a=e/'approved.tar'
with a.open('wb') as f:
    subprocess.run(['git','archive','bcab34796e4c06395686373144f01e7af20f00a8'],stdout=f,check=True)
with tarfile.open(a) as t: t.extractall(p,filter='data')
(p/'frontend/node_modules').symlink_to(r/'frontend/node_modules',target_is_directory=True)
subprocess.run(['npm','run','build'],cwd=p/'frontend',check=True)
(e/'baseline.json').write_text(json.dumps({'work':str(w)}))
PY
.venv/bin/python docs/development/financial-print-ptbr/fixture.py
(cd frontend && npm run build)
```

Inicie `server.py baseline` e `server.py candidate` com `.venv/bin/python`, em terminais separados, herdando `SILEX_PRINT_EVIDENCE`. Usam somente cópias da fixture temporária, nas portas 18096/18097. Então execute:

```bash
node docs/development/financial-print-ptbr/check-prints.cjs
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_financial_print.py backend/tests/test_finance_expansion.py backend/tests/test_financial_ledger.py -q
(cd frontend && npm test -- src/format.test.ts src/datePresentation.test.ts)
git diff --check
```

O coletor exige as marcas históricas no baseline e as novas na candidata; compara dados completos e bytes de CSV. Pode receber `SILEX_BASELINE`, `SILEX_CANDIDATE`, `GESTAO_FIREFOX_PATH` e `SILEX_CHROMIUM_PATH`. As URLs são limitadas a loopback. Encerre os servidores com Ctrl+C após o ensaio. Não envie o banco, arquivos de backup ou credenciais ao GitHub.

## Recuperação

Backup externo restrito em `~/.local/share/codex-backups/controlmax-inspired/financial-print-ptbr/approved.tar`, SHA-256 `da70ffb285ccf5be25e8e25126063ba7385e06988eac55edbd231bfceac9c217`. O arquivo foi restaurado em diretório temporário e os 529 arquivos do baseline foram conferidos.

Para reverter a proposta, use uma branch de recuperação e restaure os três arquivos de produção, o teste histórico e PENDENCIAS.md a partir do baseline; remova explicitamente os novos arquivos listados no PR. Revise o diff e crie um commit de reversão para revisão. Não aplique restauração sobre trabalho pendente nem reescreva histórico compartilhado. Banco e contratos não exigem migração ou rollback.
