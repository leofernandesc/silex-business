# Reconciliação econômica e financeira

Todos os valores abaixo são centavos inteiros, em fixtures SQLite descartáveis. Resultados esperados são constantes dos testes; nenhum valor é reconstruído de texto monetário.

| Cenário | Esperado / observado nos testes dirigidos | Prova |
|---|---|---|
| Receita manual de 10001, parcial de 4001 | DRE principal 10001; pendente 6000; caixa 4001 | `test_manual_principal_not_payment_then_partial_and_reversal` |
| Estorno da parcial | DRE permanece 10001; pendente 10001; caixa líquido 0 | Mesmo teste; API de reconciliação |
| Venda finalizada 100001, título e quitação | Uma chave `sale:id:principal`, antes e depois da baixa; CMV desconhecido impede lucro bruto final | `test_finalized_sale_has_one_fact_before_and_after_payment` |
| Venda bruta 10001, desconto comercial 1001 | RB 10001; DED 1001; RL conhecido 9000; principal/título 9000 | `test_commercial_sale_discount_is_deduction_not_second_principal` |
| Parcial 4001, juros 101, multa 1, desconto financeiro 2 | Caixa 4101; pendente 4999; principal DRE continua 9000; três componentes financeiros pendentes de reconhecimento | Mesmo teste, distinto da dedução comercial |
| OS executada 500001; custo comprovado 200001 | RB 500001, CD conhecido 200001; nenhum título automático; geração confirmada única | `test_dre_service_completion.py`, `check_dre_restart.py` |
| OS concluída sem títulos | Pendência `titles_required`, sem receita inventada | Mesmo teste |
| OFX conciliado e repetido | Nenhum segundo reconhecimento do principal | `test_ofx_match_and_replay_do_not_duplicate_recognized_principal` |
| Venda UTC 01/12 03:30 | Competência econômica 30/11 em Manaus; título e parcial em dezembro não mudam o fato | `test_sale_uses_manaus_economic_day_instead_of_title_or_payment_month` |
| Cancelamento UTC 01/12 03:30 | Revisão em 30/11 Manaus, principal original preservado | `test_cancellation_review_uses_manaus_day_without_erasing_original_fact` |
| Nenhum fato / custo ou imposto desconhecido | Valor final ausente, nunca zero presumido | Motor puro, API e E2E de falha/recuperação |
| Ausência comprovada de componente | Zero final ou não aplicável, com motivo e versão de fontes | `test_zero_assertion_requires_current_evidence_and_review_snapshot` |
| Empréstimo / financiamento | Principal não reconhecido como resultado | `test_dre_api.py` |

Encargos reconhecidos explicitamente e seus estornos foram testados em receitas e despesas: juros 101 + multa 17 − desconto 37 = resultado financeiro +81/−81 conforme a natureza, e zero após revisão dos componentes reversores. O principal de 10001 permanece único; saldo pendente volta a 10001 e caixa líquido a zero.

## Fórmulas e fronteiras

As fórmulas aprovadas e seus seis exemplos originais continuam executáveis em `test_dre_policy.py` e `test_dre_specification.py`. Margens usam Decimal e só são calculadas com componentes completos e receita líquida positiva. EBITDA não é disponibilizado apenas porque DA se cancela algebricamente: a cobertura de DA precisa estar definida.

`/finance/dre/reconciliation` separa principal reconhecido, principal do título, saldo pendente, caixa líquido histórico e caixa do período. Juros/multas/descontos reconhecidos são outra coleção. Receita econômica não é igualada ao caixa.

## Relatórios legados

`PYTHONPATH=backend .venv/bin/python scripts/compare_dre_baseline.py` executa a mesma fixture independente na base `00fcaa5...` e nesta candidata. [Resultado integral](legacy-report-comparison.json): **124 comparações iguais, 26 relatórios, zero divergências**. São 68 comparações JSON e 56 CSVs byte a byte. Datas de registro fictícias são iguais entre fixtures; somente campos voláteis JSON já delimitados pelo probe anterior são normalizados. CSV não é normalizado.

Nenhuma alteração intencional de fórmula/coluna/CSV dos 26 relatórios. A DRE possui contrato e exportação próprios e não foi incluída artificialmente no catálogo legado de 26 formatos.
