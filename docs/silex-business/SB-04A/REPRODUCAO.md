# Reprodução e revisão local

## Evidências estáticas

Abrir docs/evidence/sb04a/galeria.html para protótipo A vs implementação em 1440/768/375 e ERP baseline/candidato. Capturas reais, dados fictícios. Ler TESTES.md e JSONs para resultados e tentativas; nenhum teste usa informações persistentes de produção.

## Prévia isolada

preview.json registra URL, PID, fonte e banco descartável. A prévia usa build do candidato em /tmp, backend inalterado e SQLite próprio, em loopback. Não há deploy/hosting externo ou instalação. Sessões/registros desse ambiente não correspondem ao ERP ativo. Encerrar somente o PID documentado quando a revisão terminar.

Para reproduzir a prévia após encerramento, criar uma nova cópia de frontend/backend, reutilizar dependências locais, compilar nela e usar o modelo isolado de scripts/start_isolated.py para criar fixture e definir GESTAO_DATABASE_URL explicitamente para /tmp. Nunca executar seed/init/migração/build no checkout ativo para revisar o pacote.

## Testes deste incremento

Ambiente usado: /tmp/silex-sb04a-vfz4n4gi/{baseline,candidate}; configs exclusivos em docs/evidence/sb04a/configs. Os logs não devem ser regravados: copiar scripts/configs para uma **nova pasta de evidências**, criar novo work_dir e ajustar caminhos de saída.

- npm run build, npm test e npx tsc --noEmit no frontend da cópia.
- Launcher isolado usa fixture.sqlite3 e bancos baseline/candidate/functional, cada um separado de data/ do checkout.
- Playwright usa Firefox instalado; um runner de cada vez.
- E2E navegação/público: definir SILEX_SB04A_ENV para o manifesto do novo ambiente e SILEX_SB03_SCREENSHOTS para a nova pasta de screenshots; executar --config sb04a.config.ts.
- E2E operacional: --config sb04a-existing.config.ts; o helper acessa /entrar, preservando todas as asserções antigas.
- PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider, na cópia; fixtures usam bancos próprios temporários.
- Vite opcional usa 5173, conforme allowlist de origem existente, com proxy **somente no config temporário** para candidato 18023. Não alterar vite.config.ts/backend.

Os dois testes de expiração precisam de manifesto explicitamente marcado persistent_database_used=false e work_dir com prefixo descartável sb03/sb04a; manipulam expires_at apenas em functional.sqlite3. Sem manifesto, são ignorados pelo runner padrão. Nenhuma senha real foi usada ou solicitada.

Após testes, encerrar servidores/PIDs próprios e remover somente SQLite/WAL/SHM do work_dir, preservando dados da prévia enquanto estiver em revisão. Dependências/caches são excluídos dos manifestos e não devem ser removidos como parte da recuperação.
