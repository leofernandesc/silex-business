export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}
let sessionGeneration = 0;
export function resetSessionRequests() { sessionGeneration += 1; }

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const generation = sessionGeneration;
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    let message = "Não foi possível concluir a operação";
    try {
      message = (await response.json()).detail || message;
    } catch {
      /* servidor indisponível */
    }
    if (
      generation === sessionGeneration &&
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me" &&
      path !== "/auth/logout"
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(message, response.status);
  }
  return response.json();
}
export function query(
  values: Record<string, string | number | boolean | undefined | null>,
) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  return p.toString();
}
export function exportCsv(
  report: string,
  filters: Record<string, string | number | boolean | undefined | null> = {},
) {
  window.location.assign(`/api/reports/${report}.csv?${query(filters)}`);
}
