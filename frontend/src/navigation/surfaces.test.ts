import { describe, expect, it } from "vitest";
import { routes } from "./routes";
import { isPublicAddress } from "./surfaces";

describe("public entry independent of authentication", () => {
  it.each([
    "",
    "#modulos",
    "#demonstracao",
    "#beneficios",
    "#public-content",
    "#unknown",
    "#https://example.test",
  ])("keeps public fragment %s outside the ERP", (hash) => {
    expect(isPublicAddress({ pathname: "/", hash })).toBe(true);
  });
  it("preserves all existing operational hashes and separate paths", () => {
    for (const route of routes)
      expect(isPublicAddress({ pathname: "/", hash: `#${route.id}` })).toBe(
        false,
      );
    for (const pathname of ["/entrar", "/entrar/", "/app", "/app/", "/unknown"])
      expect(isPublicAddress({ pathname, hash: "" })).toBe(false);
  });
});
