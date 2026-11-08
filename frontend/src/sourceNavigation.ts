import {useCallback,useEffect,useState} from 'react';
import {apiRequest} from './api';
export const sourceRoutes=['sales','service-orders','finance-payable','finance-receivable','finance-plan'] as const;
export function sourceId(search:string):number|null{
 const p=new URLSearchParams(search),value=p.get('source_id');
 if(p.getAll('source_id').length!==1||!value||!/^\d+$/.test(value))return null;
 const id=Number(value);return Number.isSafeInteger(id)&&id>0&&id<=2147483647?id:null;
}
export function currentSourceId(){return typeof location==='undefined'?null:sourceId(location.search)}
export function sourceHref(origin:{route:string;id:number}){
 if(!(sourceRoutes as readonly string[]).includes(origin.route)||!Number.isSafeInteger(origin.id)||origin.id<1||origin.id>2147483647)return '/app#home';
 return '/app?source_id='+origin.id+'#'+origin.route;
}
export function clearSource(){const u=new URL(location.href);u.searchParams.delete('source_id');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}
export function useSourceRecord<T extends {id:number;direction?:string}>(path:string,identifier:number|null,receive:(row:T)=>void,expectedDirection?:string){
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const reload=useCallback(()=>setAttempt(n=>n+1),[]);
 useEffect(()=>{if(identifier===null)return;let active=true;const controller=new AbortController();setLoading(true);setError('');apiRequest<T>(path+identifier,{signal:controller.signal}).then(row=>{if(!row||row.id!==identifier||(expectedDirection&&row.direction!==expectedDirection))throw new Error('Registro de origem incompatível com esta tela.');if(active)receive(row)}).catch(e=>{if(active)setError((e as Error).message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;controller.abort()}},[path,identifier,receive,expectedDirection,attempt]);
 return {loading,error,reload};
}
