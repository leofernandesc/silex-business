# Reprodução e prévia — SB-04B

## Revisão visual

Abra docs/evidence/sb04b/galeria.html. Imagens de 1440, 768 e 375 px incluem C aprovado, Início admin/operator, menu, texto ampliado e pares antes/depois das telas preservadas. São capturas de banco fictício isolado, não dados de clientes reais.

Prévia local: http://127.0.0.1:18029/app#home. Sem sessão, apresenta /entrar e preserva o destino. Página pública: http://127.0.0.1:18029/.

Somente nesta prévia fictícia, credenciais do seed: demo.admin ou demo.operador, senha DemoLocal#2026. Banco e build vivem em /tmp; nenhuma alteração no banco do checkout. A prévia SB-04A em 18025 foi preservada. Essas URLs são loopback local, não publicação externa. Estado/PID em preview.json.

## Testes isolados

environment.json registra as cópias baseline/candidate em /tmp, backup externo e portas. O launcher scripts/start_isolated.py usa a .venv existente, cria fixture descartável com modelos/seed e separa bancos baseline/candidate/functional. Não apontar os scripts para base real nem executar seed sobre data/.

Na cópia candidate/frontend, reutilizando dependências instaladas:

```bash
npm test
node_modules/.bin/tsc --noEmit
npm run build
```

Na cópia candidate:

```bash
PYTHONPATH=backend PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest backend/tests -q
```

Config de navegador de revisão: playwright.sb04b.config.ts (cópia arquivada em evidence/scripts). Desabilita o webServer padrão para usar o launcher e escreve resultados exclusivamente no pacote novo. Rodadas finais:

```bash
SILEX_SB04B_ENV=/caminho/do/environment.json npm run test:e2e -- --config playwright.sb04b.config.ts home.spec.ts navigation.spec.ts public.spec.ts
SILEX_RESULTS=/caminho/do/operational-results.json npm run test:e2e -- --config playwright.sb04b.config.ts app.spec.ts
```

Executar em cópia isolada; testes operacionais criam/alteram registros somente ali. Config base usa Firefox local já instalado e um worker. Não exige Playwright install nem nova biblioteca.

Scripts visual_review.cjs/compare_queries.py geram capturas e comparação somente em servidores fictícios; create_gallery.py monta a galeria; finalize_evidence.py confere hashes/diffs/reversão e fontes testadas; package_review.py verifica e embala. Não modificar evidências anteriores. Os caminhos absolutos nos scripts identificam este ambiente local; adaptar conscientemente ao reproduzir em outra máquina.

## Encerramento local

Servidores de testes 18028/18027/8011 encerrados após as evidências. Prévia 18029 permanece isolada para revisão; para encerrá-la, conferir PID/cwd/comando em preview.json antes de enviar SIGTERM. Não encerrar processos de outro incremento. Nenhum deploy ou merge.
