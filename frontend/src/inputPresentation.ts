/** Formatting only: never infer identity or discard characters that need validation. */
export function compactDocument(value: string): string {
  return value.replace(/[.\s/\-]/g, "").toUpperCase();
}

function group(value: string, lengths: number[], separators: string[]): string {
  let result = "",
    offset = 0;
  lengths.forEach((length, index) => {
    if (value.length > offset) {
      result +=
        (index ? separators[index - 1] : "") +
        value.slice(offset, offset + length);
    }
    offset += length;
  });
  return result;
}

export function formatDocument(value: string): string {
  const compact = compactDocument(value);
  if (!/^[A-Z0-9]{0,14}$/.test(compact)) return value;
  return /^\d{0,11}$/.test(compact)
    ? group(compact, [3, 3, 3, 2], [".", ".", "-"])
    : group(compact, [2, 3, 3, 4, 2], [".", ".", "/", "-"]);
}

export function formatPostalCode(value: string): string {
  const compact = value.replace(/[\s-]/g, "");
  return /^\d{0,8}$/.test(compact) ? group(compact, [5, 3], ["-"]) : value;
}

export const documentPattern =
  "(?:[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}|[A-Z0-9]{2}\\.[A-Z0-9]{3}\\.[A-Z0-9]{3}/[A-Z0-9]{4}-[0-9]{2})";
