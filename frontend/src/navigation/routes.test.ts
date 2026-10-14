import { describe, expect, it } from "vitest";
import {
  appUrl,
  canAccessRoute,
  decodeReturn,
  encodeReturn,
  getRoute,
  readAddress,
  routes,
} from "./routes";

describe("Route availability and compatibility, including SB-04B home", () => {
  it("keeps all 23 modules and the legacy supplier alias alongside home", () => {
    expect(routes).toHaveLength(25);
    expect(new Set(routes.map((r) => r.id)).size).toBe(25);
    expect(getRoute("home")).toMatchObject({
      admin: false,
      group: "PRINCIPAL",
    });
    for (const route of routes) {
      expect(canAccessRoute({ role: "admin" }, route.id)).toBe(true);
      expect(canAccessRoute({ role: "operator" }, route.id)).toBe(!route.admin);
      expect(canAccessRoute(null, route.id)).toBe(false);
      for (const pathname of ["/", "/app", "/app/"]) {
        expect(readAddress({ pathname, hash: `#${route.id}` }).route).toBe(
          route.id,
        );
      }
      expect(appUrl(route.id)).toBe(`/app#${route.id}`);
    }
  });
  it("uses home by default and treats login as a separate path", () => {
    expect(readAddress({ pathname: "/app", hash: "#home" })).toMatchObject({
      route: "home",
      requested: true,
    });
    expect(readAddress({ pathname: "/app", hash: "#home" }).message).toBe("");
    expect(
      readAddress({ pathname: "/entrar", hash: "#finance" }),
    ).toMatchObject({ login: true, route: "home", requested: false });
    expect(readAddress({ pathname: "/", hash: "" }).route).toBe("home");
  });
  it.each([
    "login",
    "inicio",
    "main-content",
    "modulos",
    "https://example.test",
    "//evil.test",
    "finance%00",
    "missing",
  ])("rejects unknown fragment %s", (hash) => {
    expect(canAccessRoute({ role: "admin" }, hash)).toBe(false);
    expect(readAddress({ pathname: "/app", hash: `#${hash}` })).toMatchObject({
      route: "dashboard",
      requested: false,
    });
    expect(encodeReturn(hash)).toBeNull();
  });
  it("validates return metadata without external URL redirect", () => {
    expect(decodeReturn(encodeReturn("finance-suppliers"))).toBe(
      "finance-suppliers",
    );
    expect(decodeReturn(encodeReturn("home"))).toBe("home");
    for (const value of [
      null,
      "{",
      '"finance"',
      '{"id":"finance","origin":"query"}',
      '{"id":"//evil.test","origin":"protected-request"}',
      '{"origin":"protected-request"}',
    ])
      expect(decodeReturn(value)).toBeNull();
  });
});
