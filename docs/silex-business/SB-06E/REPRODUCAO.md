# Reprodução controlada das evidências

O ZIP é um **pacote de auditoria**, não um instalador nem cópia completa do ERP. Requer checkout do commit registrado, dependências já disponíveis e fixture descartável. Nenhum comando deste incremento instala dependências, altera o banco real ou publica o sistema.

## Referências e isolamento

- Repositório local: `/home/leofernandesc/controlmax-inspired`.
- Estado do ambiente desta execução: `/tmp/silex-sb06e-state.json`, cópias originais em `/tmp/silex-sb06e-l_2u6njd/{baseline,candidate}`; após perda dos temporários, reconstrução em `/tmp/silex-sb06e-bzjuyqgq/{baseline,candidate}` (`environment.json`). A existência desses diretórios temporários não é garantida indefinidamente.
- Instâncias de comparação:127.0.0.1:18061/18062. Suíte integrada:8011. Modais:18063; fixture de componente Vite:15161. Nenhuma porta externa ou processo de outro incremento é reutilizado.
- `fixture-provenance.json`: origem sintética, hash e contagens. Fixture congelada herdada do SB-05.3B; bancos clonados com SQLite backup, nunca cópia de banco de cliente. O ZIP não contém banco, senha, sessão, trace ou hash de credencial.
- Para reprodução posterior, usar os construtores de fixture existentes no repositório indicados na proveniência, **somente em diretório temporário** e na fase fixture. Eles dependem do calendário; clonar a mesma fixture recém-criada para as duas versões e registrar o novo hash/datas. Não esperar o SHA histórico de uma nova geração.

## Comandos de validação (em cópia isolada)

```bash
npm test
npm run build
```

No diretório raiz da cópia isolada:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider
```

Os comandos/build não são executados no frontend original. Copiar `playwright.sb06e.config.ts` ao lado da configuração aprovada no frontend isolado; exportar origem, arquivo JSON de resultados e output temporário. Definir `SILEX_SB04B_ENV` para manifesto com work_dir iniciado por `/tmp/silex-sb04b-`, banco `functional.sqlite3` e persistent_database_used=false. Testes de expiração recusam outro ambiente.

A seleção integrada é a relação de13 arquivos em TESTES.md, com três projetos originais. Modal usa dois arquivos e **outro banco**, pois fechar caixa é uma operação real no teste. Iniciar Vite com a configuração de teste que ignora outputs, sem mudar a configuração de produção. `SILEX_MODAL_ORIGIN` aponta somente para15161.

## Sondas adicionais

Definir `SILEX_ROOT`, `SILEX_EVIDENCE`, `SILEX_BASELINE` e `SILEX_CANDIDATE`. Obter `SILEX_TEST_PASSWORD` do responsável por canal separado; não gravar no arquivo de evidências nem incluir em linha de comando compartilhada. Scripts usam a variável de ambiente e não registram corpo de login/cookies.

Ordem: financial_compare.py e export_compare.py históricos em modo somente leitura → financial-flows.py em duas cópias novas → auth-safety.py → surfaces.cjs → baseline-probe.cjs → stability.cjs. Os dois primeiros são referenciados de `docs/evidence/sb06d1/scripts/`, preservados no repositório; os demais acompanham este incremento. O coletor de superfícies importa `settled` do instrumento aprovado SB-06D.2, sem executar sua matriz inteira. Não apontar qualquer script para serviço de produção.

`native-zoom.cjs` usa Firefox com janela em Xvfb privado `:1066`; `native-keys.py` recusa outro display. Usa XTest/ctypes já disponíveis, sem instalação ou interação com o desktop do usuário. `native-zoom-attempt.json` distingue tentativa de confirmação real e registra DPR/viewport/escala/CSS zoom. Qualquer roteiro manual não executado continua explicitamente pendente.

`preservation.py` exige SILEX_STATE e compara escopo/hashes/restauração. `summarize.py` rejeita casos incompletos, skips, retries e falhas; não oculta exceções. O log inicial da entrada financeira inválida é preservado separadamente; sua causa é pré-condição do instrumento, não regressão do produto. As asserções dos testes anteriores não são modificadas.

## Encerramento do ambiente

Encerrar somente processos criados para SB-06E, conferindo porta, PID e diretório de trabalho. Não parar instâncias anteriores nem navegadores do usuário. Galeria HTML funciona como arquivo estático; não depende de uma prévia servida permanecer ativa. Relatórios e ZIP preservam evidências mesmo após parar os ambientes temporários.

## Reconstrução dos temporários

Os 357 E2E concluídos na primeira fase tiveram logs/JSON preservados. Após continuação da sessão, os diretórios /tmp e servidores não estavam mais disponíveis; o arquivo Git persistente foi verificado e novas cópias criadas por rebuild-environment.py. rebuild-fixture.py executa apenas as fases sintéticas dos construtores anteriores, sem alterar seus arquivos. O calendário real atual é preservado; não há monkeypatch de regras/relógio no produto servido. As comparações35 JSON/30exports/17operações foram repetidas em clones idênticos novos, mantendo a primeira evidência em phase1. Um primeiro ensaio de reconstrução congelou somente o calendário de seeding e foi recusado pela regra de data de abertura; log preservado, abordagem removida e fixture recriada com o calendário consistente do produto.
