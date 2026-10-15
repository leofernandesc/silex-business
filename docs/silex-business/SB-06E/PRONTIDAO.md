# Critérios de prontidão e portões de aprovação

| Dimensão | Evidência disponível | Limite / condição |
|---|---|---|
| Identidade e rebranding | SVGs/Inter/tokens, público/login/Home/shell e famílias financeiras aprovadas; superfícies e regressões deste incremento | **Apto para revisão final**, com ressalvas de legado em impressão e documentação raiz. Não afirmar que todos os canais gerados usam Silex |
| Estabilidade funcional | Unitários/frontend/backend, fluxos E2E, perfis, operações financeiras e comparação de respostas/centavos | Recorte local/fixture sintética. Sem ensaio prolongado de operação, carga comercial ou todos os equipamentos/navegadores |
| Acessibilidade | Regressões específicas P01/P02/P03/P04/P06/P08/P09/V02/R02, teclado e medidas de conteúdo | Sem homologação com leitor real/toque físico; texto ampliado conserva problemas preexistentes. Teste nativo limitado ao ambiente registrado, sem conformidade WCAG integral |
| Responsividade | 26 superfícies em1440/1024/768/375/320; diagnóstico adicional de conteúdo/zoom | Excesso de conteúdo identificado separadamente do header. Corrigir só mediante autorização; seguir matriz e roteiro manual |
| Segurança/permissões | Guard central/menu, recusa401/403 real, sessão/expiração/logout/retorno/escopo operador, cabeçalhos | Não é pentest, revisão LGPD ou auditoria exaustiva de autorização por objeto. Cookie atual `Secure=false`; transporte/host/ameaças produção não homologados |
| Operação disponível | Inventário confirma cadastros, operações, caixa/estoque/vendas não fiscais, financeiro, OFX manual e relatórios | Não prometer emissão fiscal, TEF, banco automático ou assinatura SaaS |
| Implantação | Build local e API loopback com fallback de rotas existentes; recuperação de arquivos ensaiada | Sem deploy: domínio/TLS/proxy/cookies/origens/segredos, restauração banco+comprovantes, monitoramento/logs/alertas, capacidade/concorrência, incidentes/atualizações ainda exigem homologação |
| Modelo SaaS | CompanySetting id1/global; dois perfis atuais | Não há tenant/isolamento empresarial por CNPJ, seleção de empresas, assinatura/planos/cobrança/ciclo comercial. **Impedimento ao SaaS multiempresa proposto**, sem alegar vazamento entre tenants inexistentes |
| Comercial/jurídico | Página de apresentação, CTA Entrar, sem métricas/depoimentos/preço fictícios | Preço/contrato, limites, privacidade/termos, identidade jurídica/canais, suporte/SLA e fiscal conforme público-alvo não aprovados |

## Parecer

1. **Apto para revisão final do rebranding**, com as ressalvas explícitas do inventário/riscos. O incremento não muda aparência nem funcionalidades de produção.
2. **Apto para homologação controlada**, como atividade de validação em ambiente isolado, com dados fictícios, responsáveis, roteiro manual e riscos conhecidos. Não significa que todos os requisitos de acessibilidade estejam aceitos nem autorização para uso produtivo. Se o grupo de homologação depender de recurso afetado, resolver o impedimento específico antes de incluí-lo sem acompanhamento.
3. **Não comprovadamente apto para lançamento comercial.** Há portões técnicos, acessíveis, operacionais, jurídicos e de isolamento para o modelo SaaS proposto ainda sem implementação/aceite.

## Checklist de liberação futura

- [ ] Aprovar separadamente as propostas de correção dos problemas de conteúdo/reflow e de interpretação de datas; validar com usuários afetados.
- [ ] Executar H-A com leitor configurado, H-Z nos navegadores/sistemas declarados e toque físico. Registrar falhas, não apenas execuções.
- [ ] Homologar impressões/PDF/drivers/CSV em destinatários reais, com dados fictícios; decidir identidade e representação de datas dos templates legados.
- [ ] Definir implantação e concluir revisão de segurança: HTTPS, cookie Secure, origens/proxy, gestão de segredos, autorização por objeto, limites/arquivos, acesso externo e conta de demonstração fora de produção.
- [ ] Ensaiar recuperação de banco e comprovantes em infraestrutura de homologação; definir retenção, monitoramento, alertas, incidentes e capacidade.
- [ ] Definir produto comercial de empresa única ou SaaS multiempresa. Para múltiplos clientes, especificar/implementar/testar isolamento, onboarding e ciclo comercial em projeto autorizado próprio.
- [ ] Validar documentos e condições comerciais/jurídicas; não improvisar termos, garantias ou suporte inexistente.
- [ ] Revisar riscos altos/bloqueadores com responsáveis e critérios de aceite; registrar decisão final explícita.

Nenhum item pendente é considerado resolvido por esta consolidação. Manter P05/P07 parciais e V01/T01 em acompanhamento. Não propor uma limpeza global do CSS. Próxima ação recomendada: revisão do pacote e execução do roteiro manual, seguida de autorização de correções delimitadas; nenhum próximo incremento foi iniciado.
