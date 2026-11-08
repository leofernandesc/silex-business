# DRE e integração dos fluxos — implementação

Base confirmada: PR #14 aberto/Draft, `00fcaa5f869d702dda6ad535d264a0216dd11b65`. Branch isolada `feat/dre-integrated-financial-ux`; PR empilhado contra `fix/erp-commercial-readiness`. Código funcional congelado em `76f7013033f87b7990e3820695f9da874354bb91`. Os commits posteriores de evidências não devem modificar esse código; o SHA final e o CI correspondente constarão do PR.

## Entregas

| Etapa | Implementação | Prova dirigida |
|---|---|---|
| E0 | Referência remota confirmada, worktree independente, especificações recebidas em ZIP e lidas integralmente | [Baseline](BASELINE.md) e [matriz](MATRIX.md) |
| E1 | Consulta compartilhada do principal pendente, incluindo parcial e estorno; retry do histórico OFX sem sair da tela | `test_dre_receivables.py`, `ofx-errors.spec.ts` |
| E2 | Fatos canônicos, centavos inteiros, fórmulas e cobertura explícita; margens Decimal | `test_dre_policy.py`, exemplos anteriores |
| E3 | Migrações aditivas 0014–0016; histórico de mapeamento/reconhecimento/cobertura e revisão congelada | `test_dre_migration.py`, `test_dre_history.py`, interrupção e concorrência |
| E4 | Leitura econômica em lote, APIs administrativas, versões, prévia e confirmação; reconciliação e CSV | `test_dre_api.py`, `test_dre_resilience.py` |
| E5 | DRE nos Relatórios; Plano financeiro único; Início unificado; Visão financeira independente; links aos registros existentes | `dre-integration.spec.ts`, navegação e formulários existentes |
| E6 | Conclusão comprovada da OS, incorrência individual de custo e oferta contextual da geração de títulos existente | `test_dre_service_completion.py`, E2E e reinício real |
| E7 | Regressão completa, contratos dos 26 relatórios, recuperação e evidências | [Execuções](TEST-EXECUTIONS.md) |

## Decisões econômicas implementadas

- Um principal canônico por venda, serviço, custo ou título manual. Pagamentos e estornos de principal atualizam caixa/pendência, sem gerar outro principal na DRE.
- Venda de mercadoria finalizada e reconciliada com seus itens/título possui data econômica em Manaus. Produto do tipo serviço exige comprovação da entrega. Desconto comercial é dedução distinta do desconto financeiro.
- OS exige conclusão efetiva e título vinculado. Custo contratado exige comprovação individual de incorrência. Status antigo `completed` sem data permanece pendente; não foi retropreenchido.
- Título manual/OFX/recorrente requer reconhecimento explícito. Encargos exigem data e natureza econômica confirmadas. Principal de investimento/financiamento não é receita ou despesa operacional. Cancelamento gera pendência de revisão, preservando o fato original; não há reversão econômica silenciosa.
- Fatos reconhecidos e classificados confirmam RB/DO/OR/OD/FI/FE quando não há pendências. DED/CD/DA/TL exigem evidência de cobertura do período. Ausência de fatos nunca confirma zero. Componentes comprovadamente não aplicáveis têm declaração própria. Dependências desconhecidas impedem EBITDA/lucro/margens finais.
- Subcategoria prevalece sobre categoria. Vigências não podem sobrepor; substituição explícita preserva o intervalo anterior inteiro. Divisão automática de uma vigência existente não foi implementada. Histórico é acrescentado, nunca reescrito.
- Prévia de classificação apresenta fontes potencialmente afetadas, principal e períodos; não promete lucro futuro. Token vincula identidade, solicitação e fontes atuais. Confirmação obsoleta é recusada. Não há alteração do lançamento original.

## Segurança e contratos

As novas APIs `/api/finance/dre*` exigem administrador ativo; respostas GET usam `Cache-Control: no-store`. Detalhes, CSV, reconciliação, links e revisões históricas repetem os filtros de capacidade/propriedade. Revogar transporte impede consultar uma revisão antiga que revele fontes agora restritas. Nenhuma autorização usa username.

Cobertura com fontes ocultas é deliberadamente conservadora: a presença de fonte restrita na instância deixa o demonstrativo parcial, inclusive quando a data econômica dessa fonte não pode ser revelada à identidade atual. Não existe total completo que permita inferir valores privados. Isto não altera o acesso financeiro geral histórico já existente.

Não foram modificados os contratos dos 26 relatórios/CSVs. Categorias/subcategorias mantêm APIs e cadastros existentes; as rotas antigas continuam válidas. Novos endpoints de DRE e conclusão de OS são aditivos. A correção desejada do principal pendente altera somente o resultado anteriormente divergente da Home.

O ZIP original foi movido de Downloads para `specs/dre-integration/SILEX_DRE_PACOTE_CODEX.zip`, ignorado pelo Git. Somente os documentos normativos extraídos integram o PR; quebras Markdown foram representadas por `<br>` para respeitar o gate de whitespace, sem mudar seu conteúdo técnico.

## Limites e parecer

Não é uma DRE fiscal/contábil homologada. Políticas específicas de entrega de serviços, adiantamentos, tributos, CMV e depreciação exigem validação técnico-financeira. Revisões documentam responsabilidade e evidência; não comprovam por si mesmas a veracidade de uma declaração humana.

Não existe multitenancy nem isolamento por CNPJ. Não houve merge, deploy, acesso Railway, banco/backup persistente, provisionamento real, transferência de propriedade ou alteração de senhas. As identidades anteriores e seus vínculos permanecem preservados.

Parecer técnico final condicionado às execuções e gates listados em [REVIEW-CHECKLIST.md](REVIEW-CHECKLIST.md). Publicação exige autorização separada e o procedimento de [PUBLICATION.md](../financial-stage1/PUBLICATION.md).
