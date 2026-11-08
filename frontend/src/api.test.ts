import { afterEach, describe, expect, it, vi } from "vitest";
import { api, apiRequest, ApiError, resetSessionRequests, REQUEST_TIMEOUT_MS } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  resetSessionRequests();
});

describe("binary requests share the existing HTTP/session handling", () => {
  it("keeps the original binary body, filename header and cookie policy", async () => {
    const body = new Blob([new Uint8Array([0x4f, 0x46, 0x58, 0xe7])]);
    const headers = { "Content-Type": "application/x-ofx", "X-Statement-Name": encodeURIComponent("Extrato fictício.ofx") };
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":7}'));
    vi.stubGlobal("fetch", fetch);
    expect(await apiRequest("/finance/ofx/imports?account_id=2", { method: "POST", headers, body })).toEqual({ id: 7 });
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/finance/ofx/imports?account_id=2", { method: "POST", headers, body, signal:expect.any(AbortSignal), credentials: "same-origin" });
  });
  it.each([400, 401, 403, 404, 422, 500, 503])("preserves HTTP %i and never retries the body", async status => {
    const dispatchEvent = vi.fn(); vi.stubGlobal("window", { dispatchEvent });
    const fetch = vi.fn().mockResolvedValue(new Response('{"detail":"Mensagem existente"}', { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(apiRequest("/finance/ofx/imports?account_id=2", { method: "POST", body: new Blob(["OFX"]) })).rejects.toMatchObject({ status, message: "Mensagem existente" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(dispatchEvent).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
  });
  it("rejects a late binary 401 without expiring the new session", async () => {
    const dispatchEvent = vi.fn(); vi.stubGlobal("window", { dispatchEvent });
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    const pending = apiRequest("/finance/ofx/imports?account_id=2", { method: "POST", body: new Blob(["OFX"]) });
    resetSessionRequests();
    finish(new Response("{}", { status: 401 }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
  it("the existing coordinator's generation reset prevents duplicate expiration events", async () => {
    const dispatchEvent = vi.fn(() => { resetSessionRequests(); return true; });
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 401 }))));
    await Promise.allSettled([apiRequest("/finance/ofx/imports", { method: "POST" }), api("/accounts"), api("/finance/ofx/imports")]);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });
  it("handles a non-JSON 401 without exposing its HTML body", async () => {
    const dispatchEvent = vi.fn(); vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('<html>internal diagnostic</html>', { status: 401 })));
    await expect(apiRequest("/finance/ofx/imports", { method: "POST" })).rejects.toMatchObject({ status: 401, message: "Não foi possível concluir a operação" });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });
  it("does not retry a connection failure or turn it into expiration", async () => {
    const dispatchEvent = vi.fn(); vi.stubGlobal("window", { dispatchEvent });
    const failure = new TypeError("Failed to fetch"), fetch = vi.fn().mockRejectedValue(failure);
    vi.stubGlobal("fetch", fetch);
    await expect(apiRequest("/finance/ofx/imports", { method: "POST" })).rejects.toMatchObject({status:0,message:expect.stringContaining("conectar")});
    expect(fetch).toHaveBeenCalledTimes(1); expect(dispatchEvent).not.toHaveBeenCalled();
  });
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

describe('bounded and safe failures across all API consumers',()=>{
 afterEach(()=>vi.useRealTimers());
 it.each([409,429])('preserves HTTP %i and performs no retry',async status=>{
  const fetch=vi.fn().mockResolvedValue(new Response('{"detail":"Mensagem de negócio"}',{status}));vi.stubGlobal('fetch',fetch);
  await expect(api('/customers','POST',{})).rejects.toMatchObject({status,message:'Mensagem de negócio'});expect(fetch).toHaveBeenCalledTimes(1);
 });
 it.each([{detail:[]},{detail:[{loc:['body','name'],msg:'invalid'}]}])('normalizes structured validation without object stringification',async ({detail})=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({detail}),{status:422})));
  await expect(api('/customers','POST',{})).rejects.toMatchObject({status:422,message:'Confira os campos informados.'});
 });
 it.each(['<html>synthetic diagnostic</html>','Traceback\nnot-real-private-field','SELECT name FROM private_table'])('suppresses server diagnostics',async detail=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({detail}),{status:500})));
  await expect(api('/customers')).rejects.toMatchObject({status:500,message:'Não foi possível concluir a operação'});
 });
 it('rejects successful non-JSON without exposing response text',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>synthetic private data</html>')));
  await expect(api('/customers')).rejects.toMatchObject({status:200,message:'Resposta inválida do servidor. Tente novamente.'});
 });
 it('aborts stalled mutations on deadline, warns about unknown result and never replays',async()=>{
  vi.useFakeTimers();
  const fetch=vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('stopped','AbortError')))));
  vi.stubGlobal('fetch',fetch);
  const assertion=expect(api('/finance','POST',{amount_cents:101})).rejects.toMatchObject({status:0,message:expect.stringContaining('Consulte o resultado')});
  await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS+1);await assertion;
  expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
 });
 it('forwards caller cancellation and clears its deadline',async()=>{
  vi.useFakeTimers();const controller=new AbortController(),failure=new DOMException('cancelled','AbortError');
  vi.stubGlobal('fetch',vi.fn((_url,init)=>new Promise((_r,reject)=>init.signal.addEventListener('abort',()=>reject(failure)))));
  const assertion=expect(apiRequest('/customers',{signal:controller.signal})).rejects.toBe(failure);controller.abort();await assertion;expect(vi.getTimerCount()).toBe(0);
 });
});
