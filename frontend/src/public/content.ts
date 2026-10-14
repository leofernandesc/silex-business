// Curated fictional examples: never filled from API, company settings, storage or user state.
export const PUBLIC_TITLE =
  "Silex Business — Sua empresa, organizada em um só lugar";
export const PUBLIC_DESCRIPTION =
  "Organize cadastros, vendas, caixa, estoque e financeiro em um só ambiente. Conheça a Silex Business e acesse seu sistema de gestão empresarial.";
export const publicSections = [
  { id: "modulos", label: "Módulos" },
  { id: "demonstracao", label: "Demonstração" },
  { id: "beneficios", label: "Benefícios" },
] as const;
export const modules = [
  {
    title: "Cadastros",
    description: "Informações organizadas para a sua rotina.",
    items: ["Clientes e fornecedores", "Produtos e serviços"],
  },
  {
    title: "Vendas e caixa",
    description: "Acompanhe cada etapa da operação.",
    items: [
      "Registro de vendas e frente de caixa",
      "Abertura e fechamento de caixa",
      "Consulta do histórico de operações",
    ],
  },
  {
    title: "Estoque",
    description: "Consulte produtos e acompanhe seus saldos.",
    items: ["Entradas e saídas de produtos", "Movimentações de estoque"],
  },
  {
    title: "Financeiro",
    description: "Organize os registros e acompanhe o financeiro.",
    items: [
      "Receitas e despesas",
      "Contas a pagar e receber",
      "Painel e consultas financeiras",
      "Conciliação OFX com confirmação manual",
    ],
  },
] as const;
export const illustrativeSales = [
  {
    id: 103,
    customer: "Cliente Horizonte",
    date: "13/10/2026",
    payment: "Pix",
    total: "R$ 480,00",
    status: "Finalizada",
  },
  {
    id: 102,
    customer: "Cliente Aurora",
    date: "12/10/2026",
    payment: "Dinheiro",
    total: "R$ 265,00",
    status: "Finalizada",
  },
  {
    id: 101,
    customer: "Cliente Modelo",
    date: "11/10/2026",
    payment: "—",
    total: "R$ 120,00",
    status: "Rascunho",
  },
] as const;
