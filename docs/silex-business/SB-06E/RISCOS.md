# Matriz de riscos SB-06E

Não confundir defeito reproduzido, limitação de cobertura e capacidade comercial ausente. A gravidade tem o escopo indicado; bloqueador comercial não implica impedimento de testes locais acompanhados. Nenhuma correção do produto executada.

|ID|Gravidade/escopo|Achado/impacto|Evidência/frequência|
|---|---|---|---|
|S01|Bloqueador — Implantação comercial na Internet|Cookie Secure=false e transporte somente local homologado. Proteção de sessão/implantação externa sem aceite|backend/app/api.py:169; auth-safety.json; Determinístico no código e na amostra A/O|
|M01|Bloqueador — SaaS com múltiplos clientes/CNPJs|Configuração empresarial global; isolamento multitenant inexistente. Não sustenta atender empresas independentes em um banco compartilhado como tenants|backend/app/models.py CompanySetting; api.py company_settings_data id1; INVENTARIO.md; Arquitetural, não alegação de vazamento entre tenants existentes|
|C01|Alto — Legibilidade com fonte computada200 e valores elevados|Visão Geral e indicadores financeiros ultrapassam caixas; título Lançamentos não reflow em320. Valores fora da área visível e necessidade de rolagem adicional; risco para baixa visão. Pesquisar alcançável nas amostras|reflow-findings.json; reflow-detail.json; overflow-sources.json; RESPONSIVIDADE.md; Reproduzido e igual ao baseline; zoom nativo200/400 passou no recorte|
|C02|Médio — Robustez adicional abaixo de320|Home com nome longo: documento281 em256/187; Visão Geral222 em187. Necessidade de pan em cenário adicional extremamente estreito; header cabe|reflow-detail.json; surfaces.json; Reproduzido Home em baseline/candidata; somente cenário descrito|
|P05|Médio — Interpretação de datas|Input nativo mostra03/04/2026 para ISO2026-03-04; Serviços sem legenda de conferência. Usuário brasileiro pode interpretar dia/mês de forma inversa; API/ISO corretos nos testes|interaction-evidence.json; date-native-service-orders-375.png; date-native-finance-payable-375.png; Reproduzido Firefox155 ptBR; interpretação humana incorreta não foi simulada como fato|
|A01|Alto — Aceite de acessibilidade|Leitor de tela real/toque físico e todos os agentes não homologados. Lacuna de comprovação para usuários de tecnologia assistiva, não defeito automaticamente demonstrado|runtime-environment.json; HOMOLOGACAO-MANUAL.md; Não executado: Orca inativo; existe apenas validaçãoDOM/teclado e Firefox isolado|
|S02|Alto — Segurança e operação externa|Testes de permissão locais não constituem auditoria de segurança/produção. Riscos não quantificados de autorização por objeto, arquivos, configuração e operação em rede|TESTES.md; auth-safety.json; PRONTIDAO.md; Não auditado integralmente; nenhum bypass observado nos casos testados|
|O01|Alto — Implantação/continuidade|Hospedagem/TLS/monitoramento/capacidade/recuperação de desastre não homologados. Build e restauração de arquivos locais não asseguram continuidade comercial|PRONTIDAO.md; PRESERVACAO.md; Não executado em infraestrutura externa|
|V01|Médio — Estabilidade de navegação|Falha histórica no livro caixa sem causa comprovada. Intermitência histórica pode reaparecer em condições não cobertas|v01-navigation.json; histórico PENDENCIAS.md; 90/90 atuais:60 carregados+30gated; zero falhas observadas|
|T01|Médio — Estabilidade de testes públicos|Timeout histórico de networkidle sem causa comprovada. Causa pode ser teste/ambiente/temporização; impacto funcional histórico não comprovado|t01-public.json; integrated-results.json public21; histórico; 15/15 sondas atuais +21/21 testes originais, sem nova ocorrência|
|F01|Médio — Erros/expiração na Conciliação|Upload OFX usa fetch direto;401 não emite evento global e consultas auxiliares não têm Notice próprio. Backend bloqueia; feedback/saída de sessão pode divergir nesse fluxo específico|frontend/src/financePlanning.tsx FinanceReconciliation; SB-05.3A/AUDITORIA.md; Preexistente por inspeção; caminho401 de upload não reexecutado neste lote|
|F02|Médio — Semântica de erro financeiro|Dashboard mostra fallback zero ao falhar consulta, acompanhado de Notice. Possível confusão entre zero real e indisponibilidade; não é alteração de cálculo|frontend/src/ui.tsx useLoad; dashboard-interface.spec.ts estado erro; PENDENCIAS.md; Comportamento legado confirmado por fonte/teste|
|P07|Baixo — Manutenção de CSS|Cascata histórica permanece; piloto validado não justifica limpeza global. Complexidade de manutenção e regressões em refatorações amplas|SB-06D.2/MATRIZ.md; hashes de oito CSS; Estrutural;998regras e76grupos históricos, sem novoCSS|
|D01|Baixo — Consistência de marca/documentação|Print financeiro backend e README raiz conservam Gestão; print/CSV mantêm datasISO. Rebranding não abrange todos os canais gerados; ISO é inequívoco mas não padrão visual brasileiro|backend/app/api.py:498; README.md; export-equivalence.json; Determinístico e preexistente|
|J01|Médio — Lançamento comercial|Modelo econômico, contratos/privacidade/canais e limites não aprovados. Oferta comercial sem condições e operação confirmadas|PRONTIDAO.md; página pública sem preços/contratação; Pendente de decisão, não falha de interface|

## Tratamento e aceite por item

### S01

**Reprodução:** Ler flags do cookie sem seu valor; serviçoHTTP loopback.
**Proposta:** Definir TLS/proxy/origens e configuração segura da sessão; auditoria antes de liberação.
**Dependências/risco:** Decisão de infraestrutura e autorização separada de backend/configuração.
**Responsável/etapa sugerida:** Infraestrutura + segurança / etapa própria.
**Critério de aceite:** HTTPS e flags/política de sessão aprovados em homologação externa; nenhuma regressão de login/logout.

### M01

**Reprodução:** Inspecionar ausência de tenant no modelo/contratos e configuraçãoid1.
**Proposta:** Definir empresa única ou projeto separado de isolamento/onboarding/ciclo comercial.
**Dependências/risco:** Decisão de produto/modelo e implementação autorizada própria.
**Responsável/etapa sugerida:** Produto + arquitetura / projeto posterior.
**Critério de aceite:** Matriz de isolamento e autorização por empresa aprovada antes de ofertar multiCNPJ.

### C01

**Reprodução:** Duplicar fontes computadas de main nas larguras especificadas; manter dados elevados.
**Proposta:** Pilotar grade/limites intrínsecos/quebra de título por tela, preservando números completos; validar também ampliação real de texto.
**Dependências/risco:** Autorização visual própria; não reabrir R02/V02 por associação.
**Responsável/etapa sugerida:** Frontend + QA acessibilidade / correção delimitada.
**Critério de aceite:** Sem perda/overlap de números ou controles nos cenários aceitos; valores completos; teste real com usuários afetados.

### C02

**Reprodução:** Nome sintético não separável em Home; reduzir viewport a256/187.
**Proposta:** Quebra local de saudação/nome e revisão de conteúdo da Visão Geral, sem alterar dados.
**Dependências/risco:** Autorização própria de conteúdo; não é requisito normativo de187.
**Responsável/etapa sugerida:** Frontend / ajuste futuro.
**Critério de aceite:** Sem overflow de conteúdo nas larguras adicionais que forem assumidas como suporte.

### P05

**Reprodução:** Abrir formulário e preencher ISO2026-03-04; comparar desenho nativo e legenda de Pagar.
**Proposta:** Avaliar legenda brasileira reutilizável nos campos faltantes e orientação inequívoca; não criar editor customizado incidentalmente.
**Dependências/risco:** Aprovação de escopo de formulário/apresentação e homologação de nativos/leitor.
**Responsável/etapa sugerida:** Frontend + usuários / lote P05 separado.
**Critério de aceite:** Entrada/edição/filtro inequívocos e ISO idêntico; testar datas ambíguas nos navegadores suportados; manter parcial até cobrir todos.

### A01

**Reprodução:** Executar roteiro H-A/H-Z com leitor/áudio e dispositivo apropriados.
**Proposta:** Homologação assistida com registro de anúncios efetivos, controles, erros e modais.
**Dependências/risco:** Ambiente configurado e executor qualificado; sem instalar/ativar ferramentas do usuário automaticamente.
**Responsável/etapa sugerida:** QA acessibilidade + representante usuário / homologação controlada.
**Critério de aceite:** Casos essenciais executados e falhas tratadas; sem declaração de WCAG global baseada só em automação.

### S02

**Reprodução:** Revisão específica antes de expor dados reais.
**Proposta:** Revisão de ameaças/dependências, autorização, limites, segredos e operação; executar testes externos autorizados.
**Dependências/risco:** Ambiente de homologação e escopo de auditoria aprovado.
**Responsável/etapa sugerida:** Segurança + backend / antes de lançamento.
**Critério de aceite:** Riscos relevantes avaliados e bloqueadores resolvidos com evidência.

### O01

**Reprodução:** Definir ambiente e simular falha/restauração de banco+comprovantes sintéticos.
**Proposta:** Ensaiar implantação/rollback/backup/recuperação e operação prolongada, com limites definidos.
**Dependências/risco:** Autorização de infraestrutura; não há deploy neste incremento.
**Responsável/etapa sugerida:** Infraestrutura + operação / homologação separada.
**Critério de aceite:** Plano de recuperação e controles operacionais aprovados em ambiente representativo.

### V01

**Reprodução:** Consultar execuções/destinos/sessão/loading/console/rede; preservar reprodução futura.
**Proposta:** Continuar instrumentação; investigar causalmente se houver nova falha.
**Dependências/risco:** Reprodução com diagnóstico; não mudar roteamento por suspeita.
**Responsável/etapa sugerida:** Frontend + QA / acompanhamento.
**Critério de aceite:** Encerrar somente mediante causa ou decisão de monitoramento fundamentada, não por amostra verde.

### T01

**Reprodução:** Cenário original reload público e critérios reais de prontidão; rede/eventos.
**Proposta:** Manter coleta; não alterar produto/asserção para ocultar timeout.
**Dependências/risco:** Nova ocorrência observável.
**Responsável/etapa sugerida:** QA / acompanhamento.
**Critério de aceite:** Diagnóstico causal e critério de prontidão validado se houver reprodução.

### F01

**Reprodução:** Revisar upload expirado e falhas de contas/histórico/sugestões em homologação descartável.
**Proposta:** Propor tratamento consistente de erro/expiração preservando contratos/handlers financeiros.
**Dependências/risco:** Autorização funcional própria; não corrigido nesta validação.
**Responsável/etapa sugerida:** Frontend + QA / escopo separado.
**Critério de aceite:** 401/403/erro compreensíveis, sem dados privados após expiração e sem mutação indevida.

### F02

**Reprodução:** Erro de consulta no teste existente mantém Notice e fallback original.
**Proposta:** Avaliar apresentação de indisponibilidade distinta de zero em escopo próprio.
**Dependências/risco:** Decisão de apresentação/estado; sem mudar consultas/cálculos.
**Responsável/etapa sugerida:** Produto + frontend / proposta futura.
**Critério de aceite:** Erro não interpretado como confirmação de saldo zero por usuários; regressão com dados anteriores.

### P07

**Reprodução:** Consultar auditoria/ordem; hashes atuais preservados.
**Proposta:** Manter cascata até necessidade concreta; autorizar uma família por vez.
**Dependências/risco:** Testes computados/visuais e rollback de cada piloto.
**Responsável/etapa sugerida:** Frontend / manutenção autorizada.
**Critério de aceite:** Equivalência e benefício concreto por família, sem declarar P07 totalmente resolvida.

### D01

**Reprodução:** Abrir print de Pagar/Receber ou ler README.
**Proposta:** Autorizar revisão documental/templates separada, distinguindo marca de dados empresariais.
**Dependências/risco:** Não modificar impressão/regras neste incremento.
**Responsável/etapa sugerida:** Produto + frontend/backend / escopo de impressão.
**Critério de aceite:** Marca do produto fixa e datas acordadas, sem tocar informações fiscais do cliente.

### J01

**Reprodução:** Revisar checklist de lançamento.
**Proposta:** Validar decisões comerciais/jurídicas com responsáveis; não inventar termos.
**Dependências/risco:** Decisão comercial/jurídica e modelo de implantação.
**Responsável/etapa sugerida:** Produto + jurídico / antes de lançamento.
**Critério de aceite:** Condições, canais e responsabilidades confirmados e refletidos fielmente no produto.

Amostras de busca com fonte200 permaneceram alcançáveis por Tab; não se comprovou um controle essencial bloqueado nesses casos. O risco elevado de leitura e as lacunas de homologação permanecem. Se uma ação indispensável falhar durante homologação assistiva, reclassificar como bloqueador daquele fluxo e pedir autorização antes de corrigir.
