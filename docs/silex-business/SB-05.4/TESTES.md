# SB-05.4 — Testes e evidências

Todos os testes de navegador usaram cópias temporárias de `fixture.sqlite3` do SB-05.3B. Nenhum dado persistente foi usado. A resposta sintética dos indicadores foi substituída apenas no `fetch` do navegador; não houve escrita no banco nem chamada nova da aplicação.

## V02: testes originais e responsividade

| Cenário | Baseline | Candidata |
|---|---:|---:|
| Dois testes originais `P05 native ISO` em viewport móvel, pt-BR/en-US | 0/2: ambos falham somente na asserção final de largura do documento | 2/2 aprovados |
| Suíte `ledger-interface.spec.ts`, 8 cenários × desktop/tablet/celular | — | 24/24 aprovados |
| Novo `ledger-summary-responsive.spec.ts`, cenários nos três projetos | — | 3/3 aprovados |

Os testes P05 foram executados sem editar o arquivo original ou suas asserções. No baseline, os checks de tipo/ISO, formato brasileiro, `required` e limite de data passam antes da falha de overflow. O novo teste verifica os quatro valores completos, uma linha por valor, limite interno dos cartões e largura de rolagem do grupo em 1440, 768, 375 e 320 px, texto ampliado a 200% e reflow com viewport CSS de 187 px.

O arquivo [baseline-p05.txt](../../evidence/sb05-4/tests/baseline-p05.txt) registra as duas falhas originais. [candidate-p05.txt](../../evidence/sb05-4/tests/candidate-p05.txt) registra a aprovação 2/2.

## Regressão e integridade

| Verificação | Resultado |
|---|---|
| Frontend Vitest | 71/71, 11 arquivos |
| Build TypeScript + Vite | Aprovado |
| TypeScript estrito do novo E2E | Aprovado |
| Backend pytest | 69/69; um aviso de depreciação Starlette/httpx preexistente |
| Dashboard Financeiro E2E | 21/21, três larguras |
| Lançamentos E2E | 24/24, três larguras |
| API baseline/candidata | JSON idêntico para 47 linhas e o resumo do mesmo fixture |
| Banco temporário | `integrity_check=ok`; `foreign_key_check` vazio |
| `git diff --check` | Aprovado |

Resumo financeiro real do fixture em ambos os lados: entradas `R$ 799,19`; saídas `R$ 1.234.975,44`; saldo `-R$ 1.234.176,25`; 47 linhas. A comparação completa de resposta HTTP está em `docs/evidence/sb05-4/api-comparison.json`. O backend não foi alterado.

## Dimensões observadas

- 1440 px: 4 colunas; valores inteiros e dentro dos cartões; documento 1440 px.
- 768 px: 2 colunas; valores inteiros; documento 768 px.
- 375 px: 1 coluna; valores inteiros; documento 375 px (antes: 401 px).
- 320 px: 1 coluna; valores inteiros; conteúdo de Lançamentos 296/296 px. Documento 325 px por um ícone do cabeçalho global que termina em x=325; ver R02.
- Texto ampliado a 200% na raiz: cartões com uma coluna, valor maior e completo; documento 375 px.
- Reflow em 187 px CSS: o grupo de indicadores não transborda; documento 252 px devido ao cabeçalho. O headless não permitiu validar o zoom nativo do navegador. R02 continua aberta.

Medições e capturas estão em `docs/evidence/sb05-4/captures/`; a galeria offline está em `docs/evidence/sb05-4/index.html`. Os exemplos de valores são dados sintéticos identificados como demonstração.
