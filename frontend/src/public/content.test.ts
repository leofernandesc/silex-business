import { expect, it } from "vitest";
import {
  PUBLIC_DESCRIPTION,
  PUBLIC_TITLE,
  illustrativeSales,
  modules,
  publicSections,
} from "./content";
import { getRoute } from "../navigation/routes";
it("separates section IDs, fictional examples and conservative public copy", () => {
  expect(publicSections).toHaveLength(3);
  for (const section of publicSections)
    expect(getRoute(section.id)).toBeUndefined();
  expect(illustrativeSales.map((sale) => sale.status)).toEqual([
    "Finalizada",
    "Finalizada",
    "Rascunho",
  ]);
  expect(PUBLIC_TITLE).toContain("Silex Business");
  expect(PUBLIC_DESCRIPTION).toContain("financeiro");
  expect(JSON.stringify(modules)).not.toMatch(
    /ilimitad|grátis|gratuit|NF-e|NFC-e|NFS-e|Open Finance|TEF/i,
  );
});
