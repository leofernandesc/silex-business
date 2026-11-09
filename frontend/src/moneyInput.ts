/** Reais -> integer cents only. Quantities and percentage rates use parseDecimal.
 * One dot/comma with 1–2 trailing digits is decimal; a single trailing group of
 * three is ambiguous and rejected. With both signs, the last is decimal and
 * the other must group thousands. Repeated grouping or space groups require
 * exactly three digits. No rounding, floating point arithmetic or input mask.
 */
export function parseMoney(
  value: string,
  { allowNegative = false }: { allowNegative?: boolean } = {},
): number {
  const invalid = () => {
    throw new Error(
      "Informe o valor em reais, com até duas casas decimais e separadores de milhar consistentes.",
    );
  };
  if (value.length > 128) throw new Error("Valor acima do limite permitido");
  let raw = value.replace(/[\u00a0\u202f]/g, " ").trim(),
    negative = false;
  if (/[\t\r\n]/.test(value)) return invalid();
  if (raw.startsWith("-")) {
    negative = true;
    raw = raw.slice(1).trim();
  }
  if (/^R\$/i.test(raw)) raw = raw.slice(2).trim();
  if (raw.startsWith("-")) {
    if (negative) return invalid();
    negative = true;
    raw = raw.slice(1).trim();
  }
  if (negative && !allowNegative)
    throw new Error("Informe um valor monetário não negativo.");
  if (!raw || /[^\d., ]/.test(raw)) return invalid();
  let whole = raw,
    fraction = "",
    group = "";
  const dots = (raw.match(/\./g) || []).length,
    commas = (raw.match(/,/g) || []).length;
  if (dots && commas) {
    const position = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
    const decimal = raw[position];
    group = decimal === "." ? "," : ".";
    whole = raw.slice(0, position).trim();
    fraction = raw.slice(position + 1).trim();
    if (whole.includes(decimal)) return invalid();
  } else if (dots + commas === 1) {
    const separator = dots ? "." : ",";
    [whole, fraction] = raw.split(separator).map((part) => part.trim());
  } else if (dots + commas > 1) group = dots ? "." : ",";
  if ((dots + commas === 1 || (dots && commas)) && !/^\d{1,2}$/.test(fraction))
    return invalid();
  if (group) {
    if (
      whole.includes(" ") ||
      !new RegExp("^\\d{1,3}(?:\\" + group + "\\d{3})+$").test(whole)
    )
      return invalid();
    whole = whole.split(group).join("");
  } else if (whole.includes(" ")) {
    whole = whole.replace(/ +/g, " ");
    if (!/^\d{1,3}(?: \d{3})+$/.test(whole)) return invalid();
    whole = whole.replaceAll(" ", "");
  }
  if (!/^\d+$/.test(whole)) return invalid();
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > 100_000_000_000n)
    throw new Error("Valor acima do limite permitido");
  return Number(negative ? -cents : cents);
}
