# Checklist de publicação futura — nenhuma publicação autorizada

**Este prompt não autoriza merge, deploy, alteração do SQLite persistente, provisionamento na Railway nem acesso ao seu banco.** O envio da branch e a abertura de Draft PR servem apenas à revisão. As etapas abaixo permanecem pendentes de ambiente e autorização; não são registradas como executadas.

## Trabalho independente e integração

- [ ] Revisar PR desta etapa, PR #11 e a branch de formulários separadamente; decidir a ordem de integração. Não presumir que aprovação de uma branch autoriza outra.
- [ ] Resolver de forma supervisionada os hunks compartilhados descritos em [INTEGRATION.md](INTEGRATION.md), preservando autorização de transporte, estados de erro, autenticação e relatórios.
- [ ] Confirmar main/SHAs aprovados, workspace limpo e ausência de segredos/dados privados antes da publicação autorizada.

## Condições obrigatórias se a publicação incluir PR #11 ou migração 0013

1. Obter **backup verificável do SQLite persistente da Railway e dos anexos**, com ensaio de restauração em ambiente descartável. Não confundir Git com backup de dados; conferir integridade e contagem/vínculos após restauração.
2. Inventariar identidades existentes e registros especializados associados à antiga Demo, preservando IDs e propriedade. **Não transferir dados automaticamente.**
3. Conferir a aplicação da migração **0013 de forma supervisionada**, a partir do esquema real, com preservação de usuários, endereços, fretes/custos e registros financeiros. Não executar downgrade como estratégia automática.
4. Provisionar **sammya somente após confirmação do ambiente, da identidade e autorização específica**. Usar procedimento interativo seguro; não criar senha previsível nem recriar conta com vínculos existentes.
5. Testar separadamente **Demo e Sammya**, incluindo cadastro genérico, endereços especializados, menus, URLs diretas, propriedade e restrições das APIs de transporte.
6. Validar o **financeiro e os registros históricos após a atualização**: pagamentos, estornos, saldos, títulos, relatórios, IDs e vínculos; diferenças somente quando autorizadas e explicadas.
7. **Não executar downgrade, alterações de dados persistentes, merge ou deploy sem autorização explícita.** Diante de divergência, interromper e apresentar diagnóstico; preservar o backup original.

## Esta etapa financeira

- [ ] Comparar quatro valores antigos do resumo `/finance` e demais contratos; `as_of_date` é apenas metadado aditivo.
- [ ] Conferir filtros `pending`, datas ISO, atalhos, títulos parcialmente pagos e janelas de vencimento no fuso do servidor.
- [ ] Validar zeros reais, ausência de contas, carregamento, falha e recuperação; nenhuma consulta pendente pode mostrar o período anterior como resultado atual.
- [ ] Conferir os 26 relatórios e impressões/CSV preservados; repetir matriz completa apenas se os respectivos trechos mudarem na integração.
- [ ] Tratar separadamente falhas preexistentes comprovadas e testes de navegador/assistivos não executados; não marcar liberação comercial por aprovação técnica da branch.

P05 permanece parcial; P07 é dívida técnica controlada; V01/T01 continuam em acompanhamento. IMP01/F01/F02 já integradas não são reabertas por esta etapa. Homologação humana/assistiva e segurança operacional continuam independentes. Nenhuma função de transportadora se torna global por causa desta evolução financeira.
