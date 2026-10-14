# Evidências e reconstrução

Fonte: https://controlmax.appnfe.com/. Evidências coletadas anteriormente nesta conversa com REA 6.4.0; nenhuma nova inspeção do serviço original foi necessária para implementar. IDs e SHA-256 completos estão em [manifest.json](evidence/manifest.json).

## Observado

| Tela / artefato | Observação | Evidência |
| --- | --- | --- |
| Bundle entregue ao navegador | 41 scripts analisados sem falha de parser; marcação `ngx-app` e código Angular | `ev_102899716d561d8a5da778d817b1a98aac1782139068e9beaebe1deb15d305e3` |
| Painel autenticado | Menu com cadastros, movimentações, frente de caixa e financeiro | `ev_34aa35fdefcacf366b4264bb504a7e90168bb0ca9dfc721dc61a2df6356c587c` |
| Produtos / serviços | Código, descrição, unidade, código de barras, estoque, preço, situação; busca e paginação | [Captura privada](evidence/reference/produtos_lista.png) |
| Cadastro de item | Tipo produto/serviço, preço, unidade e campos fiscais | [Captura privada](evidence/reference/produtos_formulario.png) |
| Clientes | Nome, documento, contatos, endereço, situação, busca; formulário de cadastro | [Lista com busca sem registros](evidence/reference/clientes_busca.png), [formulário](evidence/reference/clientes_formulario.png) |
| Estoque | Entradas, saídas, inventário, tipo/data, impressão e exportação | [Captura privada](evidence/reference/estoque.png) |
| Financeiro | Receitas/despesas, contas, filtros e lançamentos | [Captura privada](evidence/reference/financeiro.png) |
| Recebíveis | Abertos, parciais e quitados; vencimento e atraso | [Captura privada](evidence/reference/recebiveis.png) |
| Frente de caixa | Itens, quantidade, valor, cliente, pagamento; mensagem de caixa fechado | [Captura privada](evidence/reference/pdv_fechado.png) |

Script principal observado: `main.94d7fdc84bc83af0.js`, 4.028.993 bytes, SHA-256 `6c0288833435890f21d716c5edc32490fafd050c07fb359da2d27507118a1a28`.

## Inferências

O conjunto de telas sugere um ERP com catálogo, estoque, vendas, caixa, financeiro e emissão fiscal. Referências estáticas a APIs fiscais e de pagamentos no bundle indicam integrações possíveis; não comprovam chamadas reais nem disponibilidade dessas integrações. Uma dependência React detectada não altera a observação de que a aplicação principal usa Angular.

## Limites da inspeção

- O backend original, suas transações, permissões internas e modelo de banco não foram verificados.
- Não foram concluídos vendas, abertura/fechamento de caixa, pagamentos nem gravação de cadastro no original. O botão de reabertura do caixa não foi confirmado.
- Um script externo `disable-devtool` encerrava a conexão de depuração. A inspeção estável usou um perfil temporário que bloqueou somente esse script. Isso altera a condição do navegador e limita a equivalência da observação ao ambiente normal.
- Uma captura de acessibilidade sensível foi excluída dos artefatos, assim como credenciais e armazenamento do navegador. Não houve exportação integral do ledger REA.
- As imagens podem conter identificação do ambiente original no cabeçalho; ficam somente na pasta privada ignorada pelo Git. O projeto não copia registros empresariais para o seed nem usa código, identidade ou ativos do fornecedor.

## Decisões da reconstrução

Gestão Local reproduz a organização funcional de cadastro → estoque → venda → financeiro → conferência de caixa. Marca, componentes React, backend, validação e regras transacionais são implementação própria, definida no plano. A interface conserva o padrão de navegação lateral, tabelas, filtros, cartões de resumo e cores azul/verde. Campos fiscais e recursos fora do MVP foram excluídos.

As regras de atomicidade, permissões, idempotência, estoque e caixa descritas em [ARQUITETURA.md](ARQUITETURA.md) foram implementadas e testadas no MVP. Não são afirmações sobre o funcionamento interno do original.
