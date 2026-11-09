# Fluxos e permissões da experiência integrada

| URL / contexto | Identidade | Experiência e preservação | Evidência |
|---|---|---|---|
| `#home`, legado `#dashboard` | Autenticada | Um Início, uma consulta operacional; indicadores adequados ao perfil; sem totais financeiros globais para operador | `home.spec.ts`, `navigation.spec.ts`, `dre_receivables` |
| `#finance-dashboard` | Admin | Visão financeira independente; atalhos e filtros ISO/Manaus preservados; entrada contextual para DRE | `financial-stage1.spec.ts`, estados financeiros |
| `#finance-plan` e aliases de categorias/subcategorias | Admin | Um Plano financeiro; formulários e APIs existentes, subcategorias contextuais; mapeamento versionado após prévia | `dre-integration.spec.ts`, testes de rotas |
| `#finance-reports`, opção DRE | Admin | Mesmo período aplicado e preservado ao alternar relatório; competência econômica explícita; estados parcial/indisponível completos | `dre-integration.spec.ts` |
| DRE → origem | Admin autorizado | Reabre o detalhe existente de venda/serviço/título ou categoria, sem novo cadastro. ID/rota estritos e consulta autenticada; retorno conserva período DRE | `sourceNavigation.test.ts`, E2E |
| DRE → rubrica | Admin autorizado | Drill-down paginado; impressão e CSV abrangem o período completo, independentemente da página de detalhes | API items + E2E print/CSV |
| DRE → revisão econômica | Admin autorizado | Evidência/data/natureza explícitas, erro preserva modal/campos, retry manual; sem título paralelo | E2E 503→retry, APIs |
| DRE → revisão congelada | Somente autor e fontes ainda autorizadas | Versão e valores preservados; aviso se demonstrativo atual mudou; revogação impede exposição histórica | `test_dre_api.py` |
| OS → Concluir | Admin autorizado à OS | Cliente e valor existentes; somente data/evidência e custos efetivamente incorridos. Não repete cliente ou lançamento | `test_dre_service_completion`, E2E |
| OS → geração contextual | Mesma autorização | Oferta opcional depois da conclusão; reutiliza confirmação de conta/vencimento/competência. Recusa geração duplicada | Mesmo teste, `ServiceOrderTitleRun` |
| OFX histórico com falha | Admin | Retry em tela, sem reenviar arquivo automaticamente e sem logout alternativo | `ofx-errors.spec.ts` |
| Recursos de transporte, inclusive agregados | Admin ativo + capacidade + propriedade | Mesmos guards; genérico/operador não recebem metadados. Nenhum username determina capacidade | Transporte + API DRE + revogação |

## Validação de interface

Matrizes completas usam desktop 1440×900 e celular 375×812. Os cenários responsivos existentes exercitam também 1024/768/320 px e ampliação conforme o próprio teste; não equivalem a homologação física ou WCAG completa. Axe percorre todas as rotas autorizadas e formulário de cliente, desktop/celular. Datas/modal/foco têm suíte complementar existente em ambos os motores.

Capturas e PDF em [evidence](evidence/) são do navegador real com dados inteiramente fictícios, nunca da Railway. PDF A4 gerado por Chromium; Firefox verifica mídia print/visibilidade e jornadas, sem alegar geração PDF ou impressora física. [Execuções efetivas](TEST-EXECUTIONS.md) delimitam as baterias finais e as anteriores interrompidas.
