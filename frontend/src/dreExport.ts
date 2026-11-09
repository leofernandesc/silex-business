import {api,query} from './api';
import {validResource} from './resourceValidation';
import {dreReadableCsv,dreDiagnosticCsv,dreErrorMessage} from './drePresentation';

/** Reauthorize and reread before exporting; no stale screen data or wider finance queries. */
async function exportDre(period:{start:string;end:string},diagnostic=false){
 try{
  const report=await api<Parameters<typeof dreReadableCsv>[0]>('/finance/dre?'+query(period));
  if(!validResource('/finance/dre',report))throw new Error('Resposta inválida da DRE. Atualize a consulta antes de exportar.');
  const url=URL.createObjectURL(new Blob([(diagnostic?dreDiagnosticCsv:dreReadableCsv)(report)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  try{link.href=url;link.download=diagnostic?'dre-diagnostico.csv':'dre.csv';document.body.append(link);link.click()}
  finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 }catch(error){throw new Error(dreErrorMessage(error))}
}

export const exportReadableDre=(period:{start:string;end:string})=>exportDre(period);
export const exportDiagnosticDre=(period:{start:string;end:string})=>exportDre(period,true);
