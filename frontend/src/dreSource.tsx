import {sourceHref} from './sourceNavigation';
import {useLoad} from './ui';
import {dreOperationName,type DreSourceRef} from './drePresentation';

export function DreSourceName({source}:{source:DreSourceRef}){
 const name=dreOperationName(source);
 return source.origin?<a href={sourceHref(source.origin)}>{name}</a>:<span>{name}</span>;
}
export function DreTechnical({source,codes}:{source?:DreSourceRef;codes?:string[]}){
 return <details className="dre-technical"><summary>Rastreabilidade técnica</summary>{source&&<p>Identificador: <code>{source.key}</code></p>}{codes?.map(c=><p key={c}>Código: <code>{c}</code></p>)}</details>;
}
/** Only selected/detail rows request descriptions, through existing authorized endpoints.
 * No broad finance listing, cross-session cache or fetch for hidden print rows. */
export function DreSourceDescription({source}:{source:DreSourceRef}){
 const id=source.linked_finance_entry_id||source.entry_ids?.[0]||(['finance-receivable','finance-payable'].includes(source.origin?.route||'')?source.origin?.id:undefined);
 const order=source.origin?.route==='service-orders'?source.origin.id:null;
 const identifier=id||order;
 if(!identifier||!Number.isSafeInteger(identifier)||identifier<1||identifier>2147483647)return null;
 return <Description path={id?'/finance/dre/source-entry/':'/service-orders/'} id={identifier}/>;
}
function Description({path,id}:{path:string;id:number}){
 const result=useLoad<{id:number;description:string;customer_name?:string; supplier_name?:string;code?:string;restricted_transport_costs?:boolean}>(path+id);
 const data=!result.loading&&!result.error&&result.data?.id===id&&!result.data.restricted_transport_costs?result.data:null;
 if(result.loading)return <small role="status">Consultando a descrição da operação…</small>;
 if(!data||typeof data.description!=='string')return <small role="status">Descrição indisponível. Atualize a consulta ou confira a origem conforme sua permissão.</small>;
 return <small className="dre-source-description">{data.description}{data.code&&' · '+data.code}{data.customer_name&&' · Cliente: '+data.customer_name}{data.supplier_name&&' · Beneficiário: '+data.supplier_name}</small>;
}
