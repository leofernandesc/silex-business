# Reprodução e prévia — SB-05.2

Ambiente: /tmp/silex-sb05-2-wf40tsyt; baseline/candidato criados por git archive do HEAD SB-05.1 aprovado, sem copiar data/ real. Dependências reutilizadas por symlink, sem instalações. Builds/tsbuildinfo/uploads/testes ficam em cópias descartáveis. Fixture mestre e bases baseline/candidate/functional separadas, somente dados fictícios.

Configuração e scripts próprios em docs/evidence/sb05-2/scripts. Build das duas cópias antes do launcher; ele exige manifesto não persistente e prefixo /tmp próprio. Inicializa/reutiliza somente a fixture local. Baseline 18035, candidato 18036, funcional 8011.

Na cópia frontend:

```bash
npm test
node_modules/.bin/tsc --noEmit
npm run build
node_modules/.bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --esModuleInterop --strict tests/accounts-interface.spec.ts
npm run test:e2e -- --config playwright.sb052.config.ts accounts-interface.spec.ts
```

Na cópia do projeto:

```bash
PYTHONPATH=backend PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest backend/tests -q
```

Config E2E própria desativa webServer, usa servidor funcional separado, um worker Firefox e reporter JSON. Regressão inclui app/ledger/public/home/navigation. prepare_historical_tests.py adapta SOMENTE guards dos diretórios temporários nos testes Home/navegação (originais não modificados); fornecer SILEX_SB04B_ENV apontando ao environment.json deste incremento e SILEX_RESULTS ao relatório de regressão. Diffs dos dois adapters acompanham as evidências.

Nunca apontar DB URL/manifesto para dados reais. Tests de caixa/vendas/títulos/comprovantes e expiração alteram somente a base funcional descartável. Capturas e comparação de respostas usam as outras bases equivalentes. Testes backend utilizam suas próprias fixtures; migrações pytest apenas temporárias.

Revisão: galeria.html. Prévia local exclusiva 18037/app#finance-payable, base própria fictícia/copied build testado. Contas demo.admin/demo.operador; senha DemoLocal#2026, exclusivamente demo. As prévias anteriores permanecem intactas, sem consultas que anexem linhas aos logs históricos.

Depois das evidências, encerrar somente PIDs próprios de teste após conferir cwd/comando. Manter prévia separada. Excluir somente fixture/baseline/candidate/functional.sqlite3 desse /tmp, conservando logs históricos e a base da prévia. PIDs/cleanup.json registram a execução real; não executar migrações/seed no checkout persistente.
