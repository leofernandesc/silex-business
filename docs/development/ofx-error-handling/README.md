# F01 — erros e sessão na Conciliação OFX

Base: `0377ab31dd2330655dbcc61fa6491e7f79e0fd93`. Branch: `fix/ofx-error-handling`.
Risco nível 3 pelo uso do transporte compartilhado de sessão: a extração preserva seu comportamento e não muda autenticação, permissões ou backend.

## Diagnóstico reproduzido antes da correção

| Cenário controlado no baseline | Evidência | Correção |
| --- | --- | --- |
| Upload 401 | Permanece em `/app`, nenhum evento de expiração | Upload binário usa o tratamento HTTP existente com guarda de geração da sessão |
| Contas/histórico indisponíveis | Nenhum alerta; histórico parece vazio | Loading, erro e vazio legítimo distintos; resultados antigos não confirmam atualização |
| Reabrir extrato 404 | Rejeição assíncrona sem feedback | Captura contextual e nova tentativa explícita pelo histórico |
| Sugestões/ignorar 503 | Sem feedback de sugestões; rejeição da ação | Alertas locais, proteção contra confirmação sem dados e submissões duplicadas |

Os quatro resultados originais estão em [validation.json](evidence/validation.json). Não foi necessário consultar o sistema de referência para reproduzir esses defeitos no código existente.

## Implementação

- `api.ts`: `apiRequest` compartilha a implementação anterior de `api`, aceitando o corpo binário sem serializá-lo. Mantidos cookies same-origin, erro HTTP, exclusões de login/me/logout e guarda de geração. O coordenador existente continua responsável por expiração/retorno à rota; 403 não expira sessão.
- `financePlanning.tsx`: mensagens seguras por contexto, sem HTML, stack traces ou mensagens internas do servidor. Contas, histórico, sugestões e cadastros auxiliares usam os estados já fornecidos por `useLoad`.
- Upload e abertura de extratos têm bloqueio síncrono durante requisições. A conta precisa pertencer ao conjunto bancário ativo carregado com sucesso. Corpo, limite de 10 MB, cabeçalhos e nome codificado do arquivo foram preservados.
- Ignorar mantém confirmação manual e motivo aparado com mínimo de três caracteres. Falha conserva o diálogo/motivo; sucesso fecha somente após atualizar o extrato. As ações ficam desabilitadas durante envio; o bloqueio persiste na página caso o diálogo seja fechado manualmente enquanto a operação está pendente.
- Se o POST foi aceito e somente o GET de atualização falhou, “Atualizar extrato” repete exclusivamente a consulta, sem repetir a operação financeira. Não há repetição automática de upload ou confirmação.
- Mensagens usam `Notice`/`role=alert` e carregamentos usam `role=status`. Modal e gerenciamento de foco globais não foram alterados.

## Validação proporcional

| Verificação | Resultado |
| --- | --- |
| TypeScript + Vite (`npm run build`) | Aprovados |
| API/sessão e formatação | 32 unitários: 20 API/sessão, 12 formatação |
| Backend existente: autenticação, autorização, expiração e OFX | 4 aprovados |
| Novos cenários F01 em Chromium | 38 cenários distintos cobertos, sem retries; execução inicial de 34, seguida de 13 operações afetadas pelo ajuste final e um caso adicional de OFX inválido |
| Fluxo financeiro real baseline/candidata Chromium | 1 execução por versão; resultados idênticos |
| Firefox: fluxo financeiro real e permissões | 2 aprovados |
| Navegação: login, retorno protegido/logout, P08 e 403 | 4 aprovados após preparar a fixture exigida pelo teste original |
| Feedback responsivo | 1440/768/375 sem excesso horizontal do documento |

O primeiro lote de navegação teve 3 aprovações e 1 falha: o teste de login espera a empresa sintética “Empresa Privada de Teste”, ausente no seed isolado inicial. A mesma falha foi reproduzida no baseline. Após preparar essa configuração fictícia em ambos os bancos, somente o caso afetado foi reexecutado e passou nas duas versões. Produto e asserções ficaram intactos; os resultados originais constam no JSON.

Cobertura F01: 400/401/403/404/422/500/503, conexão, respostas não JSON, OFX inválido no backend real, limite de arquivo, resposta 401 atrasada após nova sessão, eventos simultâneos de expiração, consultas vazias/indisponíveis, paginação com erro, dados auxiliares, confirmação normal, ignorar, cliques rápidos, fechamento manual durante operação e atualização posterior ao POST. Os testes verificam ausência de erros assíncronos não capturados. Casos de erro interceptados foram executados em Chromium; Firefox usa os fluxos reais devido à limitação E01 já documentada.

### Preservação financeira

Mesmos payloads de conciliar, criar entrada, criar saída e ignorar. O cenário real produziu em ambas as versões: variação bancária de **−1.366 centavos**, título pago com saldo remanescente zero, quatro FITIDs duplicados, replay 200 sem nova variação e rejeição 409 para confirmação de duplicado. Valores, datas ISO, estados e motivos coincidem no JSON pareado.

Backend, banco persistente, contratos, CSS, dependências, componentes de datas, navegação e `ui.tsx` não foram modificados. O trecho completo Dashboard/26 relatórios/impressão/orçamento em `financePlanning.tsx` permanece byte a byte igual à base. A expressão de conversão monetária e os dois construtores de payload de conciliação/criação permanecem iguais.

## Evidências compactas

- [Feedback desktop](evidence/feedback-1440.png) e [mobile](evidence/feedback-375.png), exclusivamente fictícios.
- [Resultados e hashes de preservação/restauração](evidence/validation.json).
- [Manifesto SHA-256](evidence/SHA256SUMS).

## Reprodução isolada

Pré-requisitos: dependências já instaladas, `.venv`, Brave/Chromium e Firefox existentes. Não instalar software de sistema. Use a senha **fictícia do seed-demo**, documentada no README raiz, pela variável `SILEX_TEST_PASSWORD`; não use credenciais reais.

1. Exporte `SILEX_OFX_EVIDENCE` para um diretório temporário e `SILEX_TEST_PASSWORD` no ambiente dos terminais abaixo.
2. Prepare o baseline a partir da raiz do repositório:

   ```python
   import json, os, pathlib, subprocess, tarfile, tempfile
   root = pathlib.Path.cwd()
   work = pathlib.Path(tempfile.mkdtemp(prefix='silex-ofx-errors-'))
   evidence = pathlib.Path(os.environ['SILEX_OFX_EVIDENCE'])
   evidence.mkdir(parents=True, exist_ok=True)
   archive = work / 'approved.tar'
   subprocess.run(['git', 'archive', '--output', str(archive),
                   '0377ab31dd2330655dbcc61fa6491e7f79e0fd93'], check=True)
   with tarfile.open(archive) as source:
       source.extractall(work / 'baseline', filter='data')
   (work / 'baseline/frontend/node_modules').symlink_to(root / 'frontend/node_modules')
   (evidence / 'baseline.json').write_text(json.dumps({'work': str(work)}))
   subprocess.run(['npm', 'run', 'build'], cwd=work / 'baseline/frontend', check=True)
   ```

3. Execute `npm run build --prefix frontend`. Em terminais separados, execute `.venv/bin/python docs/development/ofx-error-handling/server.py baseline` e o mesmo comando com `candidate`. Cada variante cria um SQLite independente a partir do seed fictício; recusa sobrescrever o banco. Portas loopback 18126/18127.
4. Reproduza o defeito aprovado: `node docs/development/ofx-error-handling/probe.cjs`.
5. Na pasta `frontend`, execute `npm test -- src/api.test.ts src/format.test.ts` e `npx playwright test ofx-errors.spec.ts -c playwright.ofx.config.ts`.
6. Para comparação financeira, execute `reconciliation-interface.spec.ts` com esse config e `--grep 'functional comparison'`, uma vez por variante: `SILEX_OFX_BASE_URL=http://127.0.0.1:18126`/`18127`, `SILEX_VARIANT=baseline`/`candidate`, `SILEX_COMPARISON_DIR` apontando ao diretório de evidências. Use o mesmo `SILEX_OFX_PROJECT` em ambas. Para repetir em bancos já utilizados, escolha outro nome de projeto para evitar reutilizar os FITIDs da fixture.
7. Firefox: `SILEX_OFX_FIREFOX=1 npx playwright test reconciliation-interface.spec.ts -c playwright.ofx.config.ts --grep 'functional comparison|anonymous and operator'`. Navegação: `npx playwright test navigation.spec.ts -c playwright.ofx.config.ts --grep 'login inválido|rota protegida retorna|P08:|403 de operação'`.
8. Backend, na raiz:

   ```bash
   PYTHONPATH=backend .venv/bin/python -m pytest backend/tests/test_app.py::test_auth_cookie_sessions_and_logout backend/tests/test_app.py::test_permissions_backend_and_own_records backend/tests/test_app.py::test_session_expires backend/tests/test_finance_expansion.py::test_ofx_preview_duplicates_matching_creation_and_manual_ignore -q
   git diff --check
   ```

Encerre somente os dois servidores criados. Logs completos, traces e bancos temporários não integram o PR.

## Recuperação e limites

Backup proporcional: archive Git da base e hashes dos arquivos alterados; restauração dos quatro arquivos preexistentes ensaiada em diretório temporário, com equivalência SHA-256. Para reverter depois de integração, preparar uma branch de recuperação que reverta os commits aprovados, incluindo os novos testes/instrumentos/documentos; não reescrever histórico compartilhado. Não há migração de banco ou dependências para desfazer.

Falha de rede pode deixar o resultado do POST desconhecido: a mensagem orienta consultar o extrato antes de repetir manualmente. Os bloqueios locais evitam submissões concorrentes no componente montado; a idempotência/autorização entre navegações continua a cargo do backend existente. Não houve homologação com leitor real, impressora ou dispositivo físico. Nenhuma integração bancária nova.

**F01 corrigida tecnicamente, aguardando revisão.** F02 pendente; P05 parcial; P07 dívida técnica controlada; V01/T01 em acompanhamento; IMP01 corrigida e integrada. Main preservada; merge/deploy não autorizados.
