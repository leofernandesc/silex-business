# Liberação futura — autorização separada

Este trabalho não autoriza merge, publicação, migração persistente ou provisionamento. A aprovação técnica de uma fixture não comprova segurança operacional de produção.

## Candidata e evidências

- [ ] Revisar o Draft PR para `integration/erp-full-regression`, inclusive correções financeiras e envelope HTTP.
- [ ] Conferir commit funcional, manifestos, resultados brutos e CI do HEAD final no [relatório](FINAL-REVIEW.md).
- [ ] Matriz completa de navegador aprovada em uma bateria por navegador, sem retries/skips; testes adicionais não substituem essa execução.
- [ ] Validar escopo da oferta: instância exclusiva de uma empresa ou SaaS compartilhado. **Não existe isolamento multiempresa/CNPJ. Uma instância compartilhada entre empresas independentes não pode ser liberada.**
- [ ] Definir participantes, navegadores suportados, volume de dados, limites, suporte e critérios da homologação com usuários.
- [ ] Homologação humana de fluxos/legibilidade, leitor de tela e dispositivos físicos; não comprovados por axe/Playwright.
- [ ] Não anunciar DRE/EBITDA, assinaturas, provisionamento multiempresa ou recuperação self-service como recursos implementados.

## Antes de acessar produção, mediante autorização

1. Confirmar a versão realmente em execução, esquema, espaço disponível, domínio, cookies, hosts/origens e participantes. Metadados de deployment no GitHub não verificam o SQLite nem o processo da Railway.
2. Interromper escritas durante a janela autorizada; obter backup consistente SQLite + anexos via mecanismo existente, conservar fora do volume e registrar SHA-256, controle de acesso e retenção. Não copiar apenas o arquivo SQLite ativo ignorando WAL/SHM.
3. Restaurar o backup em diretório/volume descartável, conferir integridade, chaves estrangeiras, contagens, IDs, centavos, anexos e login com credenciais tratadas fora dos relatórios. Só continuar com restauração comprovada.
4. Inventariar identidades e extensões especializadas antigas por `user_id`; executar o verificador **somente leitura** de vínculos sobre uma cópia autorizada. Não transferir dados da antiga Demo para Sammya automaticamente.
5. Confirmar a revisão inicial; ensaiar no backup o caminho até 0013. Esta candidata não acrescenta revisão de esquema. O envelope transacional de migrações foi corrigido para não deixar ALTER TABLE parcialmente aplicado.
6. Aplicar atualização/migração de forma supervisionada, uma instância e um processo; preservar volume, credenciais e IDs. Falha exige parar e investigar, sem downgrade/recriação automáticos.
7. Provisionar `sammya` somente com autorização específica e inventário anterior, via CLI protegida, preservando identidade/vínculos. Não é uma etapa executada nesta auditoria.
8. Revalidar Demo genérica, identidades especializadas distintas, operador, financeiro histórico, anexos, relatórios e permissões após a atualização.
9. Confirmar backup independente, restauração periódica, monitoramento de disponibilidade/ocupação, logs sem segredos e canal de suporte; definir RPO/RTO e responsável. Trial/volume não substituem política operacional.
10. Obter autorização explícita para disponibilização. Sem aprovação, manter a candidata fora da produção.

## Recuperação

- Banco e anexos devem ser recuperados **juntos**, de snapshot consistente, em volume novo/isolado durante o ensaio.
- Conservar imagem/commit anterior e snapshot anterior. Reverter apenas código depois de migração não garante compatibilidade de esquema.
- Se a migração falhar, verificar revisão/esquema. O teste de interrupção comprova rollback na fixture; não autoriza repetir operações em banco real sem diagnóstico.
- Nunca sobrescrever o volume original durante o ensaio. Não executar downgrade automático nem apagar histórico financeiro.

Continuam válidas as condições de [PUBLICATION](../financial-stage1/PUBLICATION.md), [integração](../financial-stage1/INTEGRATION.md) e do [módulo opcional](../../backend/TRANSPORT_OPERATIONS.md).
