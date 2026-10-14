import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, resetSessionRequests } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  resetSessionRequests();
});
describe("existing cookie API and session events", () => {
  it("keeps request contracts and same-origin credentials", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":1}'));
    vi.stubGlobal("fetch", fetch);
    expect(
      await api("/auth/login", "POST", {
        username: "example",
        password: "demo",
      }),
    ).toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: '{"username":"example","password":"demo"}',
      }),
    );
  });
  it.each([401, 403, 500])(
    "exposes status %i without changing backend messages",
    async (status) => {
      const dispatchEvent = vi.fn();
      vi.stubGlobal("window", { dispatchEvent });
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response('{"detail":"Mensagem existente"}', { status }),
          ),
      );
      await expect(api("/finance")).rejects.toMatchObject({
        name: "ApiError",
        message: "Mensagem existente",
        status,
      });
      expect(dispatchEvent).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    },
  );
  it.each(["/auth/me", "/auth/login", "/auth/logout"])(
    "lets coordinator handle %s",
    async (path) => {
      const dispatchEvent = vi.fn();
      vi.stubGlobal("window", { dispatchEvent });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
      );
      await expect(api(path)).rejects.toBeInstanceOf(ApiError);
      expect(dispatchEvent).not.toHaveBeenCalled();
    },
  );
  it("ignores expiration from requests belonging to a previous session", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const pending = api("/customers");
    resetSessionRequests();
    finish(new Response("{}", { status: 401 }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
