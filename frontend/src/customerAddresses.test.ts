import { describe, expect, it } from "vitest";
import { customerAddressSummary, emptyCustomerAddress, hasCustomerAddress, previousCollectionAddress } from "./customerAddresses";
import type { Customer } from "./types";

function customer(values: Partial<Customer> = {}): Customer {
  return { id: 1, name: "Fictício", document: null, phone: "", email: "", contact_name: "", address: "", active: true, ...emptyCustomerAddress(), ...values };
}

describe("reaproveitamento explícito do endereço anterior", () => {
  it("mantém todos os campos estruturados e não interpreta o texto cadastral", () => {
    const source = customer({ postal_code: "00000-000", street: "Rua cadastral", address_number: "7", complement: "Bloco 1", neighborhood: "Bairro fictício", city: "Cidade", state: "AM", address: "Texto anterior preservado" });
    const result = previousCollectionAddress(source)!;
    expect(result).toEqual({ textOnly: false, address: { postal_code: "00000-000", street: "Rua cadastral", address_number: "7", complement: "Bloco 1", neighborhood: "Bairro fictício", city: "Cidade", state: "AM" } });
    result.address.street = "Outra rua";
    expect(source.street).toBe("Rua cadastral");
    expect(source.address).toBe("Texto anterior preservado");
  });
  it("oferece texto curto integral como logradouro, sem parsing", () => {
    expect(previousCollectionAddress(customer({ address: "Texto livre, sem interpretação" }))).toEqual({ address: { ...emptyCustomerAddress(), street: "Texto livre, sem interpretação" }, textOnly: true });
  });
  it("não trunca texto que exceda o limite do logradouro", () => {
    const source = customer({ address: "x".repeat(181) });
    expect(previousCollectionAddress(source)).toBeNull();
    expect(source.address).toHaveLength(181);
    expect(previousCollectionAddress(customer({ address: "x".repeat(180) }))?.address.street).toHaveLength(180);
  });
  it("não inventa um endereço nem compartilha objetos vazios", () => {
    expect(previousCollectionAddress(customer())).toBeNull();
    const collection = emptyCustomerAddress(), delivery = emptyCustomerAddress();
    collection.street = "Origem";
    expect(delivery.street).toBe("");
    expect(hasCustomerAddress(delivery)).toBe(false);
    expect(hasCustomerAddress(collection)).toBe(true);
  });
  it("o resumo preserva valores e identifica conteúdo parcial", () => {
    expect(customerAddressSummary({ ...emptyCustomerAddress(), city: "Manaus", state: "AM", address_number: "123", postal_code: "00000-000" })).toBe("123, Manaus / AM, 00000-000");
    expect(customerAddressSummary(emptyCustomerAddress())).toBe("");
  });
});
