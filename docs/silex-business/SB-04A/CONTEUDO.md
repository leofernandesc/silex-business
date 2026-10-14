# Conteúdo comercial: confirmação e limites

| Descrição publicada | Evidência no código preservado |
| --- | --- |
| Clientes e fornecedores | catalog.tsx/partners.tsx; GET/POST/PUT customers e suppliers no backend |
| Produtos e serviços | catalog.tsx; tipo product/service e catálogo existentes |
| Vendas/frente de caixa/histórico | sales.tsx, PointOfSale/SalesPage; api.py sales; users.tsx AuditPage |
| Abertura/fechamento de caixa | operations.tsx CashPage; api.py cash-sessions |
| Entradas/saídas e consulta de estoque | operations.tsx StockPage; api.py stock-movements |
| Receitas/despesas, Pagar/Receber | ledger.tsx, finance.tsx e endpoints existentes |
| Painel/consultas financeiras | financePlanning.tsx; reporting.py finance/dashboard e relatórios |
| Conciliação OFX com confirmação manual | financePlanning.tsx/financial.py: importação, sugestões e confirmação de cada item |
| Serviços/pedidos, custos e títulos | serviceOrders.tsx e backend service_orders.py; geração explícita de títulos |
| Diaristas/frete e chaves PIX para consulta | partners.tsx/types.ts/supplier; financeiro usa beneficiário/PIX; não transfere valores |

As funções descritas existem e são cobertas pela suíte operacional no ambiente de demonstração. Isso não anuncia hospedagem SaaS homologada, emissão fiscal, TEF, Open Finance, integração bancária automática ou transferência PIX.

O hero financeiro usa números fixos de exemplo do protótipo A. A segunda demonstração usa vendas fictícias #103/#102/#101, clientes Horizonte/Aurora/Modelo, datas e valores fixos. Não são saldos ou vendas reais e não são preenchidos por API. Rótulos de dados fictícios permanecem visíveis e em captions.

## Pendências comerciais/jurídicas

Preço, mensalidade por CNPJ, usuários ilimitados, teste gratuito, contratação/assinatura, termos, limites comerciais, contato/suporte, razão social/CNPJ/endereço e políticas jurídicas dependem de decisão/revisão própria. Nenhuma promessa ou informação foi fabricada. Não há formulário público, cadastro, checkout ou página legal provisória.

A configuração empresarial do ERP continua global. Não usar a página comercial para prometer isolamento multitenant ou disponibilidade pública em produção. Domínio oficial, infraestrutura externa e SEO avançado permanecem pendentes.
