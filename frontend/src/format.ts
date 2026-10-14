export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export const quantity = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(n / 1000);
export const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Manaus",
      }).format(new Date(value))
    : "—";
export const dateOnly = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "—";
export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function parseDecimal(value: string, places: number): number {
  const raw = value.trim().replace(",", ".");
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(raw))
    throw new Error(
      `Informe um valor positivo com até ${places} casas decimais`,
    );
  const [whole, fraction = ""] = raw.split(".");
  const result = Number(
    BigInt(whole) * BigInt(10 ** places) + BigInt(fraction.padEnd(places, "0")),
  );
  if (!Number.isSafeInteger(result) || result > 100_000_000_000)
    throw new Error("Valor acima do limite permitido");
  return result;
}
export const decimalInput = (value: number, places = 2) =>
  (value / 10 ** places).toFixed(places).replace(".", ",");
export const itemTotal = (price: number, qty: number) =>
  Number((BigInt(price) * BigInt(qty) + 500n) / 1000n);
export const labels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  open: "Em aberto",
  paid: "Quitado",
  partial: "Parcial",
  ofx: "OFX",
  pending: "Pendente",
  duplicate: "Duplicado",
  matched: "Conciliado",
  ignored: "Ignorado",
  canceled: "Cancelado",
  draft: "Rascunho",
  finalized: "Finalizada",
  closed: "Fechado",
  cash: "Dinheiro",
  pix: "Pix",
  card: "Cartão",
  credit: "A prazo",
  product: "Produto",
  service: "Serviço",
  in: "Entrada",
  out: "Saída",
  opening: "Saldo inicial",
  inventory: "Inventário",
  sale: "Venda",
  reversal: "Estorno",
  income: "Receita",
  expense: "Despesa",
  admin: "Administrador",
  operator: "Operador",
  create: "Cadastro",
  update: "Alteração",
  finalize: "Finalização",
  cancel: "Cancelamento",
  settle: "Quitação",
  move: "Movimentação",
  close: "Fechamento",
  login: "Entrada",
  toggle: "Ativação / desativação",
  customer: "Cliente",
  user: "Usuário",
  finance: "Financeiro",
};
