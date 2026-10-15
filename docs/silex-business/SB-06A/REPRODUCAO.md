# SB-06A — Reprodução em ambiente isolado

Baseline: `67cdee96fd17c3e653e478d10fccdcd5296d2740`; branch de trabalho: `feat/sb06a-header-reflow`. O build e os testes foram executados em duas cópias `git archive` sob `/tmp/silex-sb06a-fec5rg23/`, com `.venv` e `node_modules` já instalados referenciados por symlink. Não houve instalação de dependências.

As bases visuais baseline/candidata são cópias descartáveis da fixture fictícia do SB-05.3B; os testes de escrita usam outra cópia, `/tmp/silex-sb04b-sb06a-ldoz0gvq/functional.sqlite3`. O prefixo SB-04B é exigido pelos guards de expiração dos testes herdados, preservados sem edição. Nenhum serviço usa o banco do checkout. Serviços somente em loopback: baseline 18560, candidata visual 18561, funcional 8011. A porta 8011 é necessária porque um teste antigo rejeita qualquer outra origem como externa.

## Comandos

No frontend da cópia candidata: `npm run build`, `npm test`; na raiz da cópia, `PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider`. Os testes existentes criam suas próprias bases temporárias.

Copiar `scripts/playwright.sb06a.config.ts` deste incremento para junto de `frontend/playwright.config.ts` **na cópia temporária**. Definir `SILEX_TEST_ORIGIN`, `SILEX_RESULTS`, `SILEX_OUTPUT_DIR`, `SILEX_SB04B_ENV` e `SILEX_TEST_PASSWORD` para o serviço/manifesto/conta de demonstração isolados. O manifesto precisa apontar ao SQLite descartável e declarar `persistent_database_used:false`. O ZIP omite credenciais e bancos.

Executar `node_modules/.bin/playwright test --config=playwright.sb06a.config.ts header-reflow.spec.ts navigation.spec.ts home.spec.ts public.spec.ts app.spec.ts ledger-summary-responsive.spec.ts ledger-interface.spec.ts dashboard-interface.spec.ts`. A simulação adicional de fontes computadas pode ser executada por `--grep 'computed header'` no mesmo arquivo novo.

O teste novo usa somente a senha explicitamente fornecida pelo ambiente; não acrescenta credenciais ao código. Nomes longos são substituições de resposta exclusivamente no navegador de teste; os papéis e a autorização reais permanecem os do servidor.

## Capturas e medição

`capture.cjs` recebe `SILEX_FRONTEND`, `SILEX_EVIDENCE`, `SILEX_ORIGIN`, `SILEX_VARIANT` e `SILEX_TEST_PASSWORD`. Percorre o registro real de rotas, omite apenas o alias duplicado e mede sete larguras; registra nomes longos nos dois perfis e menu aberto após a transição. `probe_content_and_text.cjs` faz o ensaio de fontes efetivamente duplicadas e identifica conteúdo independente que excede 187/256 px.

`native_zoom.cjs` e `native_keys.py` documentam a tentativa de zoom real. Exigem Xvfb próprio no display `:196`; o helper recusa qualquer outro display para não enviar teclas à sessão do usuário. Nesta instalação, a mudança de zoom não foi comprovada por viewport/DPR e o probe encerrou com erro explícito. Isso é limitação do ensaio, não aprovação de zoom nativo. Não é necessário executar esse probe para consultar a galeria ou os resultados geométricos.

`package_review.py` monta a galeria e o ZIP por whitelist, verificando CRC, hashes internos e marcadores de credenciais. Requer relatórios, evidências e commits finais já existentes. O caminho de backup é obtido do manifesto de preservação.
