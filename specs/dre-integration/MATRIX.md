# Matriz orientadora E0–E7

| Gate | Fonte / contrato | Evidência exigida |
|---|---|---|
| E1 recebíveis | dashboard, finance/dashboard, signed Payment | Parcial, estorno, vencidos, zero e operador |
| E1 OFX | imports GET, useLoad.reload | 503 → retry em tela → resultado, desktop/móvel, Chromium/Firefox |
| E2 | dre_policy, exemplos anteriores | Centavos, duplicidade, estados, dependências, margens |
| E3 | Alembic após 0013, histórico de políticas | Upgrade sintético, preservação de IDs/dados/FKs, concorrência/replay |
| E4 | fatos canônicos e APIs admin | Venda/OS/título/OFX uma vez, permissão, cobertura, CSV, reconciliação |
| E5 | home, dashboard alias, financeiro, plano e relatórios | Navegação antiga, perfil, erro/zero/carga, impressão integral |
| E6 | conclusão OS, custos e geração existente | Data comprovada, custos pendentes, confirmação e idempotência |
| E7 | suítes e 26 relatórios | Regressão integral sobre esta candidata, baseline e diferenças explícitas |

Esta matriz é uma obrigação de cobertura, não uma declaração de aprovação. Resultados observados devem constar dos relatórios de execução.
