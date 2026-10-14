# Reprodução segura

Requer o checkout completo, dependências locais já presentes e Firefox instalado. O pacote de revisão inclui diffs/fontes afetadas/evidências; não contém o banco de produção nem toda a aplicação backend.

1. Escolher uma **nova** pasta de evidências. Não sobrescrever o pacote histórico.
2. Preparar cópias do candidato e frontend anterior a partir do backup verificado:

```bash
python3 docs/evidence/sb03/scripts/prepare_isolated.py \
  --root /home/leofernandesc/controlmax-inspired \
  --backup /home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb03/20261014T061326Z \
  --evidence /tmp/silex-sb03-nova-revisao
```

3. Usar work_dir emitido pelo script. Executar npm run build nas duas cópias frontend e npm test/npx tsc --noEmit no candidato. Não executar build no checkout ativo.
4. Conferir que 18024, 18023, 8011 e, se usado, 5173 estão livres. Iniciar em outro terminal:

```bash
/home/leofernandesc/controlmax-inspired/.venv/bin/python \
  /tmp/silex-sb03-nova-revisao/scripts/start_isolated.py
```

Esse launcher usa somente work_dir/fixture.sqlite3 e três cópias SQLite. A aplicação original e data/ não são referenciadas pelos servidores. Depois, no frontend candidato:

```bash
SILEX_SB03_ENV=/tmp/silex-sb03-nova-revisao/environment.json \
SILEX_SB03_SCREENSHOTS=/tmp/silex-sb03-nova-revisao/screenshots \
npm run test:e2e -- --config sb03.config.ts
npm run test:e2e -- --config sb03-existing.config.ts
```

Executar um runner Firefox de cada vez. O novo teste de expiração só manipula sessions do banco functional.sqlite3 após validar o prefixo de ambiente descartável e persistent_database_used=false. Sem manifesto explícito, os dois cenários que precisam alterar expires_at são ignorados pelo runner padrão. Os outros testes não precisam desse acesso direto.

5. Capturas antes/depois: `node /tmp/silex-sb03-nova-revisao/scripts/visual_review.cjs`. Fontes e assets são locais; nenhum navegador deve acessar ControlMax ou dados reais.
6. Backend: no candidato, `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider`. As fixtures criam seus próprios bancos temporários; não usar GESTAO_DATABASE_URL de produção.
7. Dev Vite opcional: config sb03-vite.config.ts já aponta proxy para 18023; iniciar `node node_modules/vite/bin/vite.js --config sb03-vite.config.ts --port 5173`. Não modificar o vite.config.ts original.
8. Ao terminar, Ctrl+C no launcher/Vite; confirmar término dos filhos/portas e remover somente SQLite/WAL/SHM desse work_dir. As fontes temporárias podem ser conservadas para inspeção; evidências devem ser preservadas.

Os configs registram o Firefox local usado. Em outra máquina, atualizar o caminho apenas nas cópias de teste. Isso não autoriza instalar programas, mudar backend ou publicar a aplicação. A conferência em hosting externo permanece pendente.
