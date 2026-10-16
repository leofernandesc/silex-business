# IMP01 — Impressão dos relatórios financeiros

Base: `0ba57307a301328141bce907a0e57ca0f7f5c3dd`. Branch: `fix/financial-reports-print`. Risco moderado: apresentação compartilhada pelos 26 relatórios, com regressão dirigida dos outros caminhos de impressão.

Commit de implementação e instrumentos: `adfc4d6` (`fix: restore financial report printing`).

## Causa comprovada

No baseline, `FinanceReports` monta o `section.panel.finance-report-print` diretamente em `main#main-content`. Em mídia print, a regra global `main > :not(dialog) { display:none !important }` oculta esse próprio section. Os ancestrais main/main-shell/app-shell permanecem block; a resposta e as linhas estão carregadas. O bloco específico anterior só retirava limites de largura/overflow e não restaurava display. A margem/largura lateral de tela do main-shell também persistia na impressão.

A comparação estabilizada usa cópias da mesma fixture SQLite descartável, com resposta e tabela prontas. [Antes](evidence/monthly-before.png) / [depois](evidence/monthly-after.png), [PDF mensal A4](evidence/monthly-a4.pdf), [matriz medida](evidence/validation.json). O baseline reproduziu a tabela oculta nos 26 formatos, em ambos os motores.

## Correção localizada

- `frontend/src/styles.css`: mantém a regra global de recibos; `main > .finance-report-print { display:block !important }` restaura especificamente o relatório. Nessa rota, zera margem/largura lateral do main-shell, oculta os outros filhos de main e os controles, libera overflow/max-height e aplica uma página nomeada A4 paisagem, com 12 mm de margem. Nenhuma mudança em :root/body ou na ordem dos imports.
- A página nomeada não se aplica ao livro caixa/recibo/títulos. Os `!important` vencem a regra global existente e as dimensões do shell de tela somente na rota em questão. Texto 10 pt, cabeçalhos 9 pt, h2 14 pt; cabeçalhos da tabela repetem e linhas evitam cortes entre folhas. Valores monetários usam nowrap; descrições sem espaços podem quebrar sem perder caracteres.
- `frontend/src/financePlanning.tsx`: acrescenta nota somente impressa com página de resultados, quantidade exibida e identificação Silex Business, usando os metadados existentes. Total consultado e período aplicado já constavam no cabeçalho. Imprimir continua usando window.print e fica indisponível enquanto a consulta carrega ou falha.
- Dez formatos possuem mais de oito colunas (até 39 nos títulos). Para esses, `ReportPrintColumns` imprime as mesmas linhas em faixas de até seis campos, mantendo ordem, rótulos, formatador e numeração de linha global repetida. Não remove colunas, não modifica a tabela operacional e não busca outras páginas. Preserva inclusive os campos técnicos já exibidos.
- A4 paisagem é necessário: com 10 pt e moeda sem quebra, a largura equivalente a retrato (718 px úteis) produziu duas células monetárias excedentes no teste mensal; com 1032 px úteis, zero. Trinta e nove colunas em uma faixa única exigiriam letra excessivamente pequena ou quebra dos números; as faixas evitam isso.

Handlers de filtro/paginação/CSV, consultas, APIs, backend, cálculos, datas, permissões e templates anteriores permanecem intactos. Nenhuma dependência nova. A nota e as faixas ficam display:none em tela.

## Matriz dos 26 formatos

Linhas = exibidas/total consultado, página 1. Valores/datas/IDs/rótulos conferidos célula a célula entre tela e impressão nos dois motores; APIs e CSVs comparados ao baseline. PDFs reais gerados no Chromium, com todo o texto das células extraível.

| ID | Relatório | Colunas | Linhas | Folhas A4 da fixture |
| --- | --- | ---: | ---: | ---: |
| `cash-daily` | Fluxo de caixa diário | 8 | 20/29 | 2 |
| `cash-monthly` | Fluxo de caixa mensal | 8 | 2/2 | 1 |
| `result-monthly` | Resultado por competência | 8 | 4/4 | 1 |
| `income-category` | Receitas por categoria | 8 | 2/2 | 1 |
| `expense-category` | Despesas por categoria | 8 | 1/1 | 1 |
| `income-subcategory` | Receitas por subcategoria | 8 | 1/1 | 1 |
| `expense-subcategory` | Despesas por subcategoria | 8 | 1/1 | 1 |
| `income-account` | Receitas por conta | 8 | 2/2 | 1 |
| `expense-account` | Despesas por conta | 8 | 1/1 | 1 |
| `income-customer` | Receitas por cliente | 8 | 2/2 | 1 |
| `expense-supplier` | Despesas por fornecedor | 8 | 1/1 | 1 |
| `by-origin` | Movimentos por origem | 8 | 3/3 | 1 |
| `by-method` | Movimentos por forma de pagamento | 8 | 2/2 | 1 |
| `receivable-open` | Contas a receber em aberto | 39 | 20/25 | 17 |
| `payable-open` | Contas a pagar em aberto | 39 | 20/23 | 17 |
| `receivable-overdue` | Contas a receber vencidas | 39 | 13/13 | 10 |
| `payable-overdue` | Contas a pagar vencidas | 39 | 11/11 | 9 |
| `titles-due` | Títulos por vencimento | 39 | 20/50 | 18 |
| `titles-competence` | Títulos por competência | 39 | 20/50 | 18 |
| `settlements-daily` | Quitações por dia | 8 | 20/29 | 2 |
| `charges-monthly` | Juros e multas por competência | 8 | 4/4 | 1 |
| `discounts-monthly` | Descontos por competência | 8 | 4/4 | 1 |
| `partial-payments` | Baixas parciais | 16 | 20/31 | 10 |
| `reversals` | Estornos financeiros | 16 | 1/1 | 3 |
| `documents` | Títulos por documento | 39 | 20/45 | 18 |
| `budget-actual` | Orçamento mensal x realizado | 15 | 1/1 | 3 |

## Testes e preservação

- TypeScript (`tsc -b`), build Vite e `git diff --check` aprovados.
- 37 testes frontend de moeda/datas (`format.test.ts`, `datePresentation.test.ts`).
- 15 backend dirigidos: `test_dashboard_all_reports_budgets_and_export` e `test_financial_print.py`. Não houve motivo para repetir a suíte backend completa. Há um aviso preexistente TestClient/httpx.
- `verify.cjs`: 116 estados de mídia print = 26 formatos + página 2 + filtro + vazio, em duas versões × dois motores. Firefox 155 pt-BR/Manaus e Chromium 155 via Brave en-US/Manaus, executáveis já instalados. Respostas JSON e 26 CSVs iguais; imprimir gera zero novas requisições financeiras. Todos os formatos têm dados sintéticos não vazios na matriz principal.
- Página 2 de títulos: exatamente as linhas 21–40 dentre 50, conferidas com o conjunto da API; [PDF da página 2](evidence/titles-page2-a4.pdf). A página de resultados é distinta da quantidade de folhas físicas do PDF. Filtro aplicado reinicia página 1; edição ainda não aplicada não troca o período do documento. [Vazio identificado](evidence/empty-a4.pdf).
- 33 PDFs locais: 26 formatos + três estados adicionais + livro caixa/recibo nas duas versões. Todos os 29 PDFs de relatórios são A4 paisagem. Moedas, negativos, centavos, ano bissexto, identificadores, descrições extensas e palavras sem espaços preservados. [Baixas parciais](evidence/partial-payments-a4.pdf).
- Texto e rasterização das três folhas PDF de livro caixa/recibo idênticos antes/depois; HTML de Pagar e Receber idêntico. Esses PDFs anteriores continuam A4 retrato. Operador recebe 403 no catálogo, relatório e CSV nas duas versões/motores.
- `interactions.cjs`: imprimir por Tab/Enter, botão desabilitado durante resposta suspensa e erro sintético, ocultação do formulário de orçamento em print e Escape/retorno do foco ao acionador. Comparativos de tela idênticos byte a byte em 1440/768/375 no Chromium; mensal amplo 1440 também idêntico no Firefox. Sem novo overflow do documento nessas larguras.

Na preparação, o instrumento passou a criar explicitamente o fornecedor fictício ausente do seed; a primeira asserção de visibilidade foi corrigida para tratar uma coleção. O Firefox instalado apresenta a limitação E01 de interceptação Network.setRequestInterception: resposta suspensa/erro foram testados no Chromium. A extração inicial PDF com -layout intercalava colunas de células multilinha; -raw confirma o texto na ordem do conteúdo, mantendo os mesmos valores esperados. O gerador inicial desta documentação teve um delimitador de texto incorreto e repetiu algumas verificações, sem alteração adicional de produto. Logs locais preservados, sem retries de produto ou relaxamento das comparações.

## Reproduzir

Requer dependências locais existentes, `.venv`, Firefox Playwright, Chromium/Brave e `pdftotext`. Use somente dados fictícios. A partir da raiz:

```bash
export SILEX_REPORT_EVIDENCE="$(mktemp -d /tmp/silex-report-evidence-XXXXXX)"
export SILEX_TEST_PASSWORD='<senha fictícia do seed-demo documentada no README raiz>'
python3 - <<'PY'
from pathlib import Path
import json, os, subprocess, tarfile, tempfile
root=Path.cwd(); evidence=Path(os.environ['SILEX_REPORT_EVIDENCE'])
work=Path(tempfile.mkdtemp(prefix='silex-report-print-')); baseline=work/'baseline'; baseline.mkdir()
archive=work/'baseline.tar'
with archive.open('wb') as stream:
    subprocess.run(['git','archive','0ba57307a301328141bce907a0e57ca0f7f5c3dd'],stdout=stream,check=True)
with tarfile.open(archive) as source:
    source.extractall(baseline,filter='data')
(baseline/'frontend/node_modules').symlink_to(root/'frontend/node_modules',target_is_directory=True)
(evidence/'baseline.json').write_text(json.dumps({'work':str(work)}))
subprocess.run(['npm','run','build'],cwd=baseline/'frontend',check=True)
PY
.venv/bin/python docs/development/financial-reports-print/fixture.py
npm run build --prefix frontend
```

Inicie `server.py baseline` e `server.py candidate` usando `.venv/bin/python`, em terminais separados com as mesmas variáveis. Cada servidor clona o banco sintético uma vez e escuta somente loopback, portas 18106/18107. Depois:

```bash
node docs/development/financial-reports-print/verify.cjs
node docs/development/financial-reports-print/interactions.cjs
(cd frontend && npm test -- src/format.test.ts src/datePresentation.test.ts)
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_finance_expansion.py::test_dashboard_all_reports_budgets_and_export backend/tests/test_financial_print.py -q
git diff --check
```

Não reutilize bancos persistentes. Encerre os servidores após o ensaio. Os scripts não instalam pacotes. Caminhos de executáveis podem ser informados por GESTAO_FIREFOX_PATH/SILEX_CHROMIUM_PATH. Evidências completas desta execução ficam em `docs/evidence/financial-reports-print/`, ignoradas; o PR inclui somente o material essencial acima.

## Limitações e recuperação

A matriz verifica mídia print nos dois motores e PDFs efetivos no Chromium. Não houve diálogo nativo de impressão Firefox, impressora física, leitor de tela real ou PDF/UA homologado. Campos estruturados que a tabela atual apresenta como `[object Object]` conservam essa representação; interpretá-los seria outro escopo. Formatos de 39 campos e textos extensos geram muitas folhas (17–18 nesta fixture de 20 linhas), pois nenhum campo ou centavo é descartado. Não se promete impressão de todas as páginas de resultados.

IMP01 está corrigida e validada tecnicamente neste recorte, aguardando revisão. P05 permanece parcial (CSV/contratos e homologação humana/assistiva); P07 parcial e V01/T01 em acompanhamento, sem correções incidentais.

Git preserva o baseline aprovado; o ensaio usa git archive isolado para executar essa versão e cópias independentes do SQLite sintético. Os dois arquivos de produção foram recuperados em diretório temporário e seus SHA-256 conferidos com o baseline. [Manifesto](evidence/integrity.json). Para desfazer, preparar uma branch de recuperação limpa, restaurar somente esses dois arquivos do baseline e propor o diff de reversão para revisão. Não há dependência ou banco a migrar. A main não é alterada por este PR.
