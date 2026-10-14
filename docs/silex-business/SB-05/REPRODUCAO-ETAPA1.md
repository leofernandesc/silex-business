# Reprodução — SB-05 etapa 1

Revisão estática: docs/evidence/sb05-1/galeria.html. Prévia local em http://127.0.0.1:18034/app#finance, usando somente cópia/build testados e banco fictício isolado. Sem sessão abre /entrar e retorna ao livro caixa após login.

Contas exclusivas dessa demonstração: demo.admin e demo.operador; senha DemoLocal#2026. Não usar em contas reais. Dados/capturas não representam a base persistente da aplicação. As prévias anteriores em 18025/18029 permanecem intactas. Não houve publicação externa.

## Ambiente isolado

Baseline Git 61c744f e candidato em /tmp, descritos em environment.json. Dependências instaladas são reutilizadas por symlink, sem npm/pip install. Build das duas cópias antes do launcher; ele verifica frontend/dist/index.html e restringe caminho/manifesto a ambiente não persistente. Cria ou reutiliza somente sua fixture local; os três servidores têm bases separadas.

Na cópia frontend:

```bash
npm test
node_modules/.bin/tsc --noEmit
npm run build
```

Na cópia do projeto:

```bash
PYTHONPATH=backend PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest backend/tests -q
```

E2E usa a config arquivada playwright.sb05.config.ts, copiada para candidate/frontend, com webServer desativado para usar o launcher próprio, um worker Firefox e resultados na pasta nova. Na cópia frontend:

```bash
npm run test:e2e -- --config playwright.sb05.config.ts ledger-interface.spec.ts
SILEX_RESULTS=/caminho/existing-e2e-results.json npm run test:e2e -- --config playwright.sb05.config.ts app.spec.ts
SILEX_RESULTS=/caminho/public-e2e-results.json npm run test:e2e -- --config playwright.sb05.config.ts public.spec.ts
```

Não executar esses fluxos sobre dados reais. Rotinas operacionais criam/quitam/estornam registros apenas na base funcional descartável. Não apontar environment.json/DB URL para base de produção. Scripts de captura/comparação usam somente os dois bancos equivalentes não utilizados pelas operações E2E.

Scripts próprios em evidence/sb05-1/scripts são versionados: launcher, captura, comparação de consultas, prova AST, configuração de navegador, galeria, recuperação/preservação, prévia e pacote. Resultados/imagens/logs/bancos/builds não são versionados. Caminhos absolutos identificam este ambiente; adaptar conscientemente em outra máquina.

## Encerramento

Servidores de testes 18032/18033/8011 encerrados após as evidências; bancos de teste descartados. Prévia 18034 permanece com base própria fictícia e PID em preview.json. Conferir PID/cwd/comando antes de encerrá-la, preservando processos de outros incrementos. Nunca executar migração/seed no checkout real como parte desta revisão.
