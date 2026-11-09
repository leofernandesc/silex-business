export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}
let sessionGeneration = 0;
export function resetSessionRequests() { sessionGeneration += 1; }
export const REQUEST_TIMEOUT_MS = 30_000;

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  return apiRequest<T>(path, {method, headers:body ? {"Content-Type":"application/json"} : {},body:body ? JSON.stringify(body) : undefined});
}

function responseMessage(detail: unknown): string {
  if (typeof detail !== 'string') return Array.isArray(detail) ? 'Confira os campos informados.' : 'Não foi possível concluir a operação';
  // API business messages remain intact; HTML/trace/SQL diagnostics never become UI feedback.
  if (!detail.trim() || detail.length > 400 || /[<>\r\n]|Traceback|sqlalchemy|SQLITE_|SELECT .+ FROM |password_hash/i.test(detail)) return 'Não foi possível concluir a operação';
  return detail;
}

/** A bounded request, no retries, and the existing session-generation guard. */
export function apiRequest<T>(path:string,init:RequestInit):Promise<T>{return request<T>(path,init,'json');}
async function request<T>(path: string, init: RequestInit, format:'json'|'csv'): Promise<T> {
  const generation = sessionGeneration;
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) forwardAbort();
  else init.signal?.addEventListener('abort',forwardAbort,{once:true});
  let timedOut = false;
  const timer = setTimeout(() => {timedOut=true;controller.abort();},REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api'+path,{...init,signal:controller.signal,credentials:'same-origin'});
    if (!response.ok) {
      if (generation===sessionGeneration && response.status===401 && !['/auth/login','/auth/me','/auth/logout'].includes(path)) window.dispatchEvent(new Event('session-expired'));
      let detail:unknown;
      try { detail=(await response.json()).detail; } catch { /* Never expose non-JSON diagnostics. */ }
      throw new ApiError(responseMessage(detail),response.status);
    }
    let value:T;
    try {
      if(format==='csv') {
        if(!response.headers.get('content-type')?.toLowerCase().includes('text/csv'))throw new Error('Invalid CSV response');
        value=await response.blob() as T;
      } else value=await response.json();
    }
    catch (error) { if(controller.signal.aborted)throw error; throw new ApiError('Resposta inválida do servidor. Tente novamente.',response.status); }
    // Logout/login already advance this generation. A successful old response
    // must not populate the next identity's screen or create a late download.
    if(generation!==sessionGeneration)throw new ApiError('A sessão mudou durante a solicitação. Consulte o resultado antes de reenviar uma operação.',0);
    return value;
  } catch (error) {
    if (timedOut) throw new ApiError((init.method||'GET')==='GET'?'Tempo limite da consulta. Tente novamente.':'Tempo limite da solicitação. Consulte o resultado antes de reenviar uma operação.',0);
    if (init.signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e consulte o resultado antes de reenviar.',0);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort',forwardAbort);
  }
}
export function query(values:Record<string,string|number|boolean|undefined|null>) {
  const p=new URLSearchParams();
  for(const [k,v] of Object.entries(values))if(v!==undefined&&v!==null&&v!=='')p.set(k,String(v));
  return p.toString();
}
/** Downloads stay in the ERP on failure and use the same session/deadline policy. */
export async function downloadCsv(path:string,filename:string) {
  const blob=await request<Blob>(path,{method:'GET'},'csv');
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{link.href=url;link.download=filename;document.body.append(link);link.click();}
  finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
export function exportCsv(report:string,filters:Record<string,string|number|boolean|undefined|null>={}) {
  return downloadCsv(`/reports/${report}.csv?${query(filters)}`,`${report}.csv`);
}
