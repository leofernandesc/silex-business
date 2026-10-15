# Preservação e recuperação — SB-05.3B

## Baseline e isolamento

HEAD aprovado confirmado 86e9400da21316c9eaeb9bfba277cc6f654584fd, branch feat/sb05-financeiro inicialmente limpa. Snapshot SHA-256 de **2.542 originais**, abrangendo fontes, dados/builds locais e evidências históricas, excluindo .git, dependências, venv, caches, symlinks e os diretórios novos do incremento. Os dois únicos originais autorizados a diferir são financePlanning.tsx e PENDENCIAS.md.

Fontes do baseline/candidata extraídas por git archive em `/tmp/silex-sb053b-mb6vpfgi`. Dependências existentes reutilizadas. Builds e artefatos de testes ficaram nessa cópia; dist/ do checkout foi preservado. Banco mestre fictício criado pelo seed/API existentes, com clones separados para capturas e operações. Valores elevados/negativos e diferentes competências foram criados por APIs somente na fixture descartável. Nenhum banco real foi copiado, migrado ou usado para testes.

## Backup verificável

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb05-3b/silex-sb053b-mb6vpfgi`

Contém todos os originais alterados: `frontend/src/financePlanning.tsx` e `docs/silex-business/PENDENCIAS.md`, com manifest.json/SHA-256 conferidos antes das alterações. O ZIP inclui esses dois originais e seus hashes, sem bancos.

Ensaio em diretório temporário separado: copiar versões atuais, restaurar os dois originais e conferir o hash do baseline; criar/remover os quatro novos arquivos frontend necessários à reversão: financialDashboard.css, dashboardPresentation.tsx, dashboardPresentation.test.ts e tests/dashboard-interface.spec.ts. Resultado/caminho em preservation-test.json. O checkout ativo não foi restaurado.

## Provas de preservação

- 2.540 originais inalterados; os dois modificados estão no escopo. Manifestos baseline-sha256.json e after-sha256.json.
- Análise AST: mesmos 40 handlers, 26 chamadas de rede/query, 25 controles nativos, seis SummaryCards, duas expressões de altura, tooltip, maps de classificação/contas, três declarações de configuração/estado do Dashboard e 18 declarações externas. Todas as demais funções do arquivo permanecem exatas, incluindo a Conciliação.
- Backend, banco do checkout, API, autenticação, permissões, navegação, cálculos, vínculos, templates, shell, público/Home/Visão Geral, fontes/SVG/tokens, demais módulos e evidências anteriores preservados.
- Artefatos novos listados em file-inventory.json, com caminho/status/tamanho/SHA-256. Git é o mecanismo principal; backup é proteção adicional. manifest.sha256 cobre o conteúdo do ZIP e zip.sha256 verifica o arquivo externo.

## Reversão após revisão

1. Conferir branch/HEAD, hashes e alterações posteriores. Uma divergência exige revisão antes de copiar/remover arquivos.
2. Restaurar os dois originais de recovery/original no ZIP ou do backup externo verificado.
3. Remover somente os quatro novos arquivos frontend listados acima, após conferir seus hashes/ausência de trabalho posterior. O import de CSS/helper desaparece ao restaurar financePlanning.tsx.
4. Conferir os hashes e executar build/testes em ambiente isolado. Registrar a reversão em novo commit; sem reset --hard, clean, force push ou reescrever histórico.
5. Documentos/scripts/evidências próprios podem permanecer como histórico. Se for necessário recuperar o conjunto rastreado exato, revisar o inventário e remover apenas os arquivos novos do incremento em commit de reversão, preservando evidências históricas externas.

O backup permite restaurar todos os originais alterados; a remoção dos quatro arquivos novos foi ensaiada. Backend e banco não precisam de recuperação, pois não sofreram alterações. Servidores próprios 18044–18047 são encerrados apenas após confirmar PID/cwd/uvicorn; nenhum servidor anterior é usado ou encerrado.
