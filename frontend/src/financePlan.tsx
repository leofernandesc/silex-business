import {useState} from 'react';
import type {Category,Subcategory} from './types';
import {CatalogForm} from './financeCatalog';
import {ActiveFilter,LoadFeedback,PageTitle,SearchBox,useLoad} from './ui';
export function FinancePlanPage({initialSubcategories=false}:{initialSubcategories?:boolean}){
 const [version,setVersion]=useState(0),[q,setQ]=useState(''),[active,setActive]=useState(''),[editing,setEditing]=useState<{kind:'categories'|'subcategories';row:Category|Subcategory|null;parent?:Category}|null>(null);
 const categories=useLoad<Category[]>('/categories',version),subcategories=useLoad<Subcategory[]>('/subcategories',version);
 const done=()=>{setEditing(null);setVersion(v=>v+1)};
 const visible=(r:Category|Subcategory)=>(!active||r.active===(active==='true'))&&(!q||r.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
 return <><PageTitle title="Plano financeiro" subtitle="Categorias e subcategorias existentes, com classificação DRE versionada."><button type="button" className="primary" onClick={()=>setEditing({kind:'categories',row:null})}>Nova categoria</button><button type="button" onClick={()=>setEditing({kind:'subcategories',row:null})}>Nova subcategoria</button></PageTitle><section className="panel"><div className="toolbar"><SearchBox value={q} onChange={setQ}/><ActiveFilter value={active} onChange={setActive}/></div><LoadFeedback resource={categories} label="categorias"/><LoadFeedback resource={subcategories} label="subcategorias"/>
 {!categories.loading&&!categories.error&&categories.data?.filter(c=>visible(c)||subcategories.data?.some(s=>s.category_id===c.id&&visible(s))).map(category=><details key={category.id} open={initialSubcategories||!!q}><summary><strong>{category.name}</strong> · {category.active?'Ativa':'Inativa'}</summary><p><button type="button" onClick={()=>setEditing({kind:'categories',row:category})}>Editar categoria {category.name}</button> <button type="button" onClick={()=>setEditing({kind:'subcategories',row:null,parent:category})}>Nova subcategoria de {category.name}</button></p><ul>{subcategories.data?.filter(s=>s.category_id===category.id&&visible(s)).map(sub=><li key={sub.id}>{sub.name} · {sub.active?'Ativa':'Inativa'} · {sub.affects_result?'Incide no resultado':'Não incide no resultado'} <button type="button" onClick={()=>setEditing({kind:'subcategories',row:sub})}>Editar subcategoria {sub.name}</button></li>)}</ul></details>)}
 {!categories.loading&&!categories.error&&!categories.data?.length&&<p>Nenhuma categoria cadastrada.</p>}</section>
 {editing&&<CatalogForm kind={editing.kind} row={editing.row} categories={editing.parent?[editing.parent]:categories.data||[]} categoryLookup={categories} close={()=>setEditing(null)} done={done}/>}</>;
}
