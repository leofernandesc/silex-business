# Esquema, reinício e recuperação

## Migrações aditivas

| Revisão | Conteúdo | Preservação |
|---|---|---|
| 0014, após 0013 | Histórico de mapeamentos, decisões, cobertura e revisões de período | Nenhum backfill ou reclassificação |
| 0015 | Evidência de conclusão da OS e incorrência de custos, referências de autor e chave idempotente | Colunas anuláveis; datas antigas não inferidas |
| 0016 | Não aplicabilidade explícita e índices de leitura | Declarações anteriores continuam `complete`; nenhuma linha financeira reescrita |

`test_dre_migration.py` constrói revisões 0012 e 0013 sintéticas, compara todas as colunas/linhas anteriores, aplica `head` duas vezes e verifica `integrity_check=ok`, `foreign_key_check=[]`. Downgrade somente em laboratório sem dados de política e novo upgrade comprovam compatibilidade de esquema; **downgrade não é o plano de recuperação de produção**.

`test_dre_resilience.py` injeta falha após ALTER efetivo da 0015: revisão fica em 0013, colunas e novas tabelas não ficam parcialmente aplicadas. Novo upgrade conclui normalmente. O teste histórico `test_migration_recovery.py` também percorre o esquema sintético antigo até o `head` atual, preservando cadastros, valores e anexos.

## Reinício real e restauração

Comando: `SILEX_DRE_RESTART_OUTPUT=/tmp/dre-restart.json PYTHONPATH=backend .venv/bin/python scripts/check_dre_restart.py`.

Três processos Uvicorn distintos, banco exclusivo temporário, senha aleatória não impressa, sem seed-demo. Cria OS, comprova conclusão/custo, gera títulos pela API existente, associa mapeamentos, anexo PDF sintético e revisão de período. Encerra/reinicia o processo com o mesmo arquivo; depois restaura bundle consistente em outro SQLite e inicia novamente.

Resultado observado em [evidência](evidence/restart.json): todas as linhas/IDs anteriores iguais, fatos de 500001 e 200001, bytes do anexo iguais, integridade ok, zero violações de FK. Banco, senha e bundle foram removidos com o diretório temporário; somente o recibo sem dados privados integra esta entrega.

## Futuro ambiente persistente — não executado

Antes de qualquer publicação: confirmar ambiente/revisão; obter backup SQLite consistente incluindo anexos, validar hash e restaurar em laboratório; inventariar identidades e vínculos especializados; autorização específica; aplicar migrações supervisionadas com uma única instância; verificar integridade, dados e acessos; preservar backup anterior até aceite. Em erro, interromper sem apagar/recriar SQLite; recuperar a cópia verificada mediante autorização. Não provisionar Sammya nem transferir propriedade automaticamente. Preservar também [PUBLICATION.md](../financial-stage1/PUBLICATION.md).

Nenhum acesso a SQLite/volume/backup Railway, usuários reais ou dados da transportadora ocorreu nesta tarefa.
