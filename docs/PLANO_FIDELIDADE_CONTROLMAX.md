# Evolução de fidelidade ao ControlMax

## Objetivo e decisões

Aproximar a experiência, a organização das telas e os fluxos observados no ControlMax, com identidade própria. As Sprints 14–18 deste ciclo foram implementadas e têm validação técnica registrada em [VALIDACAO.md](VALIDACAO.md). Isso não garante equivalência completa com as regras internas do sistema de referência.

Decisões confirmadas pelo usuário nesta etapa:

- Nome provisório: **Gestão**, enquanto marca e visual definitivo são definidos.
- **Diaristas** e **Frete Subcontratado** em Cadastros, com contato, documento e PIX.
- Ambos também são beneficiários em **Contas a Pagar**.
- Os custos deverão ser vinculados a **serviço/pedido** para apurar o resultado da operação. O vínculo operacional será implementado na Sprint 18.
- A geração de títulos é manual e única por serviço; título criado não significa pagamento feito.
- Valor padrão de diária/frete é uma sugestão editável; o valor contratado no serviço é a referência financeira.
- Cancelamento mantém pedido, custos, títulos e pagamentos no histórico; cancela títulos em aberto e registra estornos para baixas ainda reversíveis.

O cadastro de Frete Subcontratado representa o prestador/transportadora; uma contratação específica, com data, valor e serviço, será um registro operacional separado. Criar o prestador, cadastrar PIX ou copiar a chave não gera título nem pagamento.

## Evidências e grau de certeza

Esta comparação reutiliza capturas guardadas nesta máquina. Não houve nova navegação, autenticação ou gravação no ControlMax durante esta etapa. O manifesto original está em [evidence/manifest.json](evidence/manifest.json); os limites estão em [ANALISE_REA.md](ANALISE_REA.md).

| Observação / requisito | Fonte | Efeito no planejamento |
| --- | --- | --- |
| Menu lateral claro, cabeçalho compacto, ações azuis, listas e filtros densos | Capturas privadas [produtos](evidence/reference/produtos_lista.png), [estoque](evidence/reference/estoque.png) e [recebíveis](evidence/reference/recebiveis.png) | Revisar estrutura, espaçamentos e hierarquia; dimensões exatas serão medidas por tela |
| Cadastros, Movimentações e Financeiro como grupos de navegação | Inspeção do menu, evidência ev_34aa35fdefcacf366b4264bb504a7e90168bb0ca9dfc721dc61a2df6356c587c | Grupos recolhíveis, página ativa clara e atalhos operacionais |
| Livro caixa: períodos rápidos, conta, origem, comprovante e base de data | [Financeiro](evidence/reference/financeiro.png) e dois prints de Lançamentos fornecidos pelo usuário | Refinar densidade, posição das ações e consistência lista/cards/CSV |
| Recebíveis: Em aberto, Parciais e Baixados; vencidos, vencem em sete dias e títulos | [Recebíveis](evidence/reference/recebiveis.png) | Corrigir situações, filtros e indicadores da própria tela |
| Documento, contatos, endereço e situação em clientes | [Formulário](evidence/reference/clientes_formulario.png) | Melhorar formulário e busca mantendo dados antigos |
| Código, descrição, tipo, unidade, preço, estoque e código de barras | [Produtos](evidence/reference/produtos_lista.png) e [formulário](evidence/reference/produtos_formulario.png) | Aperfeiçoar o catálogo e preservar preços históricos |
| Diaristas, Frete Subcontratado e vínculo ao serviço/pedido | Solicitação e respostas do usuário | Requisito próprio aprovado; não é recurso comprovado do ControlMax |
| PIX com CPF, CNPJ, e-mail, telefone e chave aleatória | [Documentação oficial do DICT](https://bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html) | Validar formato e normalizar a chave; existência e titularidade não são consultadas |

O bundle Angular foi observado, mas sua estrutura técnica não precisa ser reproduzida para oferecer os mesmos fluxos. Evidência estática: ev_102899716d561d8a5da778d817b1a98aac1782139068e9beaebe1deb15d305e3. Vendas, caixa, Agenda, Ordem de Serviço, envio e pagamentos externos não foram concluídos no original; suas transações permanecem desconhecidas.

## Diferenças concretas encontradas

1. A aplicação usa menu escuro de 245 px e cabeçalho alto; a referência tem menu claro próximo de 200 px, cabeçalho mais baixo e controles compactos.
2. Rótulos recorrentes de ambiente local/demonstração davam aparência de protótipo. A primeira limpeza foi feita neste incremento; capacidade de uso web será tratada separadamente na Sprint 19.
3. Fornecedores ficava escondido atrás de Cadastro de Contas. Agora tem acesso direto em Cadastros, junto aos novos prestadores.
4. Os cards de Contas a Pagar/Receber vêm do dashboard global, enquanto a lista usa filtros próprios. Precisam consultar o mesmo recorte.
5. Contas a Receber permite alternar para despesas e Contas a Pagar para receitas. A direção de cada página precisa ser fixa.
6. O seletor de situação não oferece Parciais, apesar de o backend suportar baixas parciais.
7. Faltam o indicador de vencimento em sete dias, períodos rápidos e o botão Pesquisar para aplicar o rascunho dos filtros de títulos.
8. Os serviços ainda são itens do catálogo; não existe pedido/ordem com equipe, frete e resultado da execução.

## Sprints propostas

Cada sprint tem duração sugerida de uma semana, ajustável à capacidade e à quantidade de telas que precisem de novas evidências. Planning define histórias; Review demonstra dados fictícios; Retrospectiva registra ajustes. Não se presume aprovação de negócio porque os testes técnicos passaram.

| Sprint | Prioridade | Entrega | Estado |
| --- | --- | --- | --- |
| 14 | P0 | Diaristas, Frete Subcontratado, PIX e apresentação inicial | Implementada neste incremento; resultados em VALIDACAO.md |
| 15 | P0 | Interface e navegação próximas à referência | Implementada; evidências responsivas e regressão em VALIDACAO.md |
| 16 | P0 | Fidelidade e consistência financeira | Implementada; filtros, totais, impressão e CSV testados |
| 17 | P1 | Cadastros e catálogo mais completos | Implementada; migração preserva dados legados |
| 18 | P0 | Serviço/pedido com diaristas, frete e apuração de resultado | Implementada; vínculo solicitado pelo usuário |
| 19 | P1 | Preparação de hospedagem, segurança de rede e operação | Fora deste incremento; permanece planejada |

### Sprint 14 — cadastros de prestadores e PIX

- S14-01: telas independentes de Diaristas e Frete Subcontratado em Cadastros; Fornecedores acessível diretamente.
- S14-02: nome/razão social obrigatório, CPF/CNPJ e contato opcionais, endereço, observações e situação.
- S14-03: PIX opcional com tipo, chave e titular; telefone normalizado com DDI, e-mail em minúsculas, CPF/CNPJ formatados e chave aleatória.
- S14-04: escolher os três tipos de beneficiário ao criar Conta a Pagar; mostrar a chave e o titular ao registrar baixa por PIX; permitir copiar.
- S14-05: nome provisório Gestão, limpeza dos rótulos de demonstração na estrutura, migração 0007 e preservação de dados.
- Aceite: criar/editar/inativar, filtrar por tipo e situação, buscar por nome/documento/contato/PIX; dados persistem; inativos saem de novos títulos e continuam nas obrigações existentes; operador não acessa cadastros/PIX administrativos.
- Aceite financeiro: cadastro e cópia não movimentam saldo; baixa só ocorre ao confirmar o registro; criar título continua sem alterar conta; relatórios mantêm o beneficiário vinculado.

### Sprint 15 — interface e navegação

- S15-01: estabelecer base visual neutra e próxima à referência: menu claro, azul nas ações, cabeçalho mais baixo, tipografia e espaçamentos compactos.
- S15-02: Cadastros, Movimentações e Financeiro recolhíveis; subitens com página ativa e estados preservados durante a navegação.
- S15-03: alinhar os nomes visíveis observados, como Frente de Caixa e Produtos ou Serviços, sem quebrar os endereços das telas existentes.
- S15-04: identidade provisória configurável e identificação da empresa com dados fornecidos pelo usuário.
- S15-05: consolidar cards, botões, tabelas, formulários, filtros, estados vazios e mensagens em componentes consistentes.
- Aceite: comparar lado a lado telas representativas em 1440, 768 e 375 px; ações principais no mesmo contexto; foco/teclado e menu móvel funcionais; tabelas extensas com rolagem interna.
- Review: login, layout, uma lista de cadastro e livro caixa; marca definitiva permanece aberta.
- Entrega: identidade Gestão configurável, menu claro recolhível, cabeçalho compacto, nomes revisados e componentes refinados; comportamento responsivo e navegação cobertos pela regressão do navegador.

### Sprint 16 — fidelidade financeira

- S16-01: direção fixa por página, situações Em aberto/Parciais/Baixados, cancelados disponíveis em filtro próprio.
- S16-02: consulta backend compartilhada por lista, totais, impressão e CSV; agregados sobre todo o filtro antes da paginação.
- S16-03: cards de saldo pendente, vencidos, vencem em sete dias e quantidade; regra de fronteira dos sete dias documentada e verificável.
- S16-04: períodos rápidos e campos de rascunho aplicados por Pesquisar; conta, beneficiário, documento e base de data.
- S16-05: revisão visual do livro caixa conforme prints; comparação dos modais de receita/despesa e quitação quando houver evidência.
- S16-06: ampliar orçamento/relatórios com filtro por tipo de beneficiário sem perder os vínculos existentes.
- S16-07: diferenciar ocorrência recorrente de parcela: recorrência repete o valor integral; parcelamento que divide um valor só entra após definir sua regra.
- Aceite: mudar filtro atualiza lista e cards do mesmo conjunto; CSV e impressão reproduzem o recorte; pagar não recebe receita e receber não recebe despesa; principal restante consistente com todas as baixas/estornos.
- Entrega: páginas a pagar/receber fixam a direção, distinguem títulos abertos/parciais/quitados/cancelados, aplicam filtros ao pesquisar e mantêm os quatro cards sobre todo o conjunto filtrado. O intervalo “vence em 7 dias” inclui hoje e o sétimo dia; os valores usam o principal ainda pendente. O limite foi testado com datas antes, no sétimo e no oitavo dia.
- Descoberta necessária: detalhes do modal original de baixa, estorno, encargos e ações Enviar/Verificar Pagamentos. Recursos sem integração verificada ficam como histórias de descoberta.

### Sprint 17 — cadastros e catálogo

- S17-01: clientes/fornecedores com endereço em campos separados, contatos e busca por campo selecionado.
- S17-02: produtos/serviços com agrupamento e apresentação próximos à referência, filtros por tipo/situação e ações de linha consistentes.
- S17-03: revisão de documentos, formatos e duplicações sem invalidar registros antigos.
- S17-04: informações operacionais necessárias dos prestadores e possível valor padrão da diária/frete, após definir seu uso.
- Aceite: migração preserva dados e IDs; edição não altera descrições/preços copiados para vendas; serviço continua sem movimento de estoque; registros inativos preservam o histórico.
- Entrega: endereço/contato estruturados para clientes e fornecedores, seleção do campo de busca, grupos e filtros de catálogo e valor padrão opcional nos dois tipos de prestador. O valor padrão só sugere o campo do serviço e permanece editável.
- Descoberta necessária: marca, campos extras de cliente, dados do veículo/transportador e necessidade real de campos fiscais.

### Sprint 18 — serviço/pedido e custos

- S18-01: cadastrar serviço/pedido com cliente, descrição, data, valor negociado e andamento; vocabulário final definido pela operação da empresa.
- S18-02: associar diaristas com quantidade de diárias e valor acordado naquele serviço.
- S18-03: associar prestadores de frete com valor e detalhes da contratação.
- S18-04: mostrar receita prevista, custos previstos, pagamentos/recebimentos efetivos e resultado de cada serviço.
- S18-05: ação explícita para gerar títulos vinculados ao serviço e prestador, com vencimento e competência; idempotência impede duplicação.
- S18-06: cancelamento/alteração com histórico e preservação das baixas existentes.
- Aceite: custo cadastrado não é tratado como pago; vínculo aparece no pedido e no título; somas usam centavos; repetição da geração não duplica obrigação; estorno financeiro altera realizado sem apagar o custo contratado.
- Decisões adotadas a pedido do usuário: geração por ação manual explícita, vencimento e competência informados nesse passo, sem pagamento automático; valor padrão é opcional e editável; valor acordado do serviço congela depois da geração. Cancelamento dos títulos registra estornos quando houver baixas e não apaga histórico. Adiantamentos não estão cobertos.
- Limite técnico: os campos opcionais de vínculo em `finance_entries` não têm FK SQLite, pois adicioná-la exigiria reconstruir uma tabela já referenciada por pagamentos, anexos e conciliações. As rotas validam os vínculos e os índices evitam duplicar títulos por custo; exclusão física de pedidos não é oferecida.

### Sprint 19 — preparação web

- S19-01: configuração de empresa e usuários/permissões conforme funções reais.
- S19-02: configurar servidor, domínio, HTTPS, origens autorizadas e sessão para o destino escolhido.
- S19-03: avaliar concorrência e definir se SQLite continua adequado ou se a migração para PostgreSQL é necessária.
- S19-04: backup automático, restauração demonstrável e logs operacionais.
- S19-05: preparar pacote de publicação e roteiro de operação; revisão do destino e publicação como etapa final.
- Aceite: configuração verificável para ambiente escolhido; login/permissões funcionam por HTTPS; recuperação testada em banco separado; dados da demonstração não se confundem com registros reais da empresa.

## Regras preservadas durante a evolução

Títulos em aberto não alteram saldo. Uma baixa reduz o principal pendente; juros, multa e desconto são discriminados. Estorno mantém o original e registra motivo. Repetições não duplicam pagamentos. Dinheiro respeita caixa aberto; serviços não movimentam estoque. Inativação preserva histórico e OFX exige confirmação manual.

PIX cadastrado serve para identificação e cópia. A validação é de formato, sem consulta ao DICT, confirmação de titularidade ou ordem de transferência. Contas a Pagar mostra o PIX atual do cadastro antes da baixa; ele não representa uma chave historicamente verificada em pagamentos antigos. Integração bancária futura exige identificar provedor e regras de confirmação.

## Próxima entrega

As Sprints 14–18 estão implementadas nesta cópia, mas continuam sujeitas à Review de negócio. A Sprint 19 segue planejada para definir destino, acesso por HTTPS, concorrência, backups operacionais e restauração. Esta entrega não publicou o sistema nem o preparou para receber dados reais em rede.
