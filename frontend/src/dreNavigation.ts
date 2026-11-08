import {civilDate} from './civilDates';
import {localDate} from './format';
export function readDrePeriod(search:string,today=localDate()):{start:string;end:string}|null{
 const p=new URLSearchParams(search);if(p.getAll('dre_view').length!==1||p.get('dre_view')!=='dre')return null;
 const start=p.get('dre_start')||today.slice(0,7)+'-01',end=p.get('dre_end')||today;
 if(p.getAll('dre_start').length>1||p.getAll('dre_end').length>1||!civilDate(start)||!civilDate(end)||start>end)return null;
 return {start,end};
}
export function dreHref(period?:{start:string;end:string}){
 const q=new URLSearchParams({dre_view:'dre',...(period?{dre_start:period.start,dre_end:period.end}:{})});return '/app?'+q.toString()+'#finance-reports';
}
