# SB-07E — pareceres independentes e checklist

| Categoria | Parecer | Limites / decisão necessária |
|---|---|---|
| A — Rebranding | **Concluído no escopo das interfaces aprovadas; apto à revisão consolidada** | Marca/SVG/Inter e superfícies públicas/autenticadas preservadas. Impressão backend e documentação legada ainda usam Gestão em pontos conhecidos; não afirmar uniformidade de todo documento gerado |
| B — Homologação controlada | **Apto, com dados fictícios, acompanhamento e ressalvas explícitas** | Fluxos/financeiro/datas e acessibilidade automatizada têm cobertura rastreável. Leitor real, compreensão humana e dispositivos físicos continuam pendentes. Não autoriza dados de clientes nem produção |
| C — Integração Git | **Tecnicamente preparado para fast-forward, sujeito a autorização e conferência final** | Main é ancestral, história íntegra, nenhuma integração feita. Confirmar SHA aceito/limpeza/backup completo e revisar credenciais fictícias conhecidas antes de compartilhar o histórico |
| D — Implantação técnica | **Não homologada** | HTTPS/proxy/origens/cookies/segredos, backup consistente de banco+anexos, monitoramento/capacidade/continuidade e segurança de ambiente externo ainda exigem trabalho próprio |
| E — Lançamento comercial | **Não comprovadamente apto** | Ausência de isolamento multiempresa/provisionamento/assinaturas/cobrança comercial; condições jurídicas/comerciais e homologação assistiva não concluídas. Nada neste incremento autoriza oferta SaaS multiempresa |

## Capacidades existentes e ausentes

Existem autenticação por sessão, dois perfis, uma configuração empresarial global, cadastros, vendas/caixa/estoque, serviços com geração explícita de títulos, financeiro, OFX manual e relatórios não fiscais. Recorrência de títulos não é assinatura do software; cadastro PIX não realiza transferência; recibo não é NF-e/NFC-e/NFS-e. O inventário funcional detalha disponibilidade/perfis e limitações.

Não existem contratos/modelos de tenant por CNPJ, isolamento entre clientes independentes, provisionamento de empresas, gestão de planos/limites, contratação/checkout público ou cobrança recorrente SaaS. Não se declara que a simples configuração de company_name implemente multiempresa. Deve-se decidir primeiro entre instalação de empresa única e plataforma SaaS; o segundo modelo exige projeto de arquitetura e segurança separado.

## Checklist antes de qualquer publicação

- [ ] Aprovar explicitamente o pacote e o SHA de integração; executar o plano Git com backup verificável e testes posteriores.
- [ ] Executar homologação assistiva/humana dos fluxos prioritários e toque físico, registrando resultados reais.
- [ ] Decidir saídas humanas brasileiras e compatibilidade dos CSVs; tratar marca/datas/status técnicos das impressões sem alteração silenciosa de contratos.
- [ ] Definir ambiente de hospedagem e validar TLS, proxy/fallback de rotas, origens, cookies Secure, gestão de segredos, contas de demonstração e autorização por objeto.
- [ ] Revisar dependências Python contra base de avisos apropriada; npm audit sem alertas não cobre backend nem todas as ameaças.
- [ ] Ensaiar recuperação consistente de banco e comprovantes; definir retenção, responsáveis, monitoramento, alertas, incidentes e capacidade.
- [ ] Aprovar modelo comercial/escopo de empresa única ou projeto de isolamento multiempresa; validar preços, termos, privacidade, canais de suporte e obrigações fiscais aplicáveis.
- [ ] Registrar aceite dos riscos altos/bloqueadores no contexto específico. Não encerrar V01/T01 por associação com uma suíte verde.

Recomendação imediata: revisar este pacote e autorizar a integração Git separadamente, se aceita, seguindo os portões do plano. A homologação humana/assistiva e o planejamento de implantação devem ter responsáveis e ambiente próprios. Nenhuma próxima implementação está autorizada automaticamente.
