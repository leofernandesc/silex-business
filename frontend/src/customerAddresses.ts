import type { Customer, CustomerAddress } from "./types";

// Match the existing customer address fields and limits.
export const customerAddressFields = [
  ["postal_code", "CEP", 9],
  ["street", "Logradouro", 180],
  ["address_number", "Número", 30],
  ["complement", "Complemento", 100],
  ["neighborhood", "Bairro", 100],
  ["city", "Cidade", 100],
  ["state", "UF", 2],
] as const;

export function emptyCustomerAddress(): CustomerAddress {
  return { postal_code: "", street: "", address_number: "", complement: "", neighborhood: "", city: "", state: "" };
}

export function hasCustomerAddress(address: CustomerAddress) {
  return customerAddressFields.some(([key]) => Boolean(address[key].trim()));
}

export function customerAddressSummary(address: CustomerAddress) {
  return [address.street, address.address_number, address.complement, address.neighborhood,
    [address.city, address.state].filter(Boolean).join(" / "), address.postal_code].filter(Boolean).join(", ");
}

export function previousCollectionAddress(customer: Customer) {
  const structured = Object.fromEntries(customerAddressFields.map(([key]) => [key, customer[key]])) as CustomerAddress;
  if (hasCustomerAddress(structured)) return { address: structured, textOnly: false };
  // Never parse or truncate legacy free text. This copy needs explicit UI confirmation.
  if (customer.address.trim() && customer.address.length <= 180) {
    return { address: { ...emptyCustomerAddress(), street: customer.address }, textOnly: true };
  }
  return null;
}
