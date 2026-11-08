import {describe,it,expect} from 'vitest';
import {validResource,validUser} from './resourceValidation';
describe('GET structure guards never interpret malformed responses as empty success',()=>{
 it.each(['/customers','/products','/suppliers','/sales','/service-orders','/stock-movements','/cash-sessions','/audit','/finance/ofx/imports','/finance/reports/cash-monthly'])('validates paginated %s',path=>{
  expect(validResource(path,{items:[],total:0,page:1,page_size:20})).toBe(true);
  for(const value of [null,{},[],{items:null,total:0,page:1,page_size:20},{items:[],total:0,page:0,page_size:20},{items:[null],total:1,page:1,page_size:20}])expect(validResource(path,value)).toBe(false);
 });
 it.each(['/accounts','/categories','/subcategories','/users','/finance/budgets','/finance/reports/catalog'])('validates array %s',path=>{expect(validResource(path,[])).toBe(true);expect(validResource(path,{})).toBe(false);expect(validResource(path,[null])).toBe(false);});
 it('distinguishes no open cash from a missing response shape',()=>{expect(validResource('/cash-sessions/current',null)).toBe(true);expect(validResource('/cash-sessions/current',{})).toBe(false);});
 it('does not fabricate missing account money',()=>{expect(validResource('/accounts',[{id:1,name:'Fixture',opening_cents:0,balance_cents:0}])).toBe(true);expect(validResource('/accounts',[{id:1,name:'Fixture'}])).toBe(false);});
});

it('requires a complete active authentication identity',()=>{const user={id:1,name:'Fixture',username:'fixture',active:true,role:'admin',capabilities:[]};expect(validUser(user)).toBe(true);for(const invalid of [{},null,{...user,active:false},{...user,role:'owner'},{...user,capabilities:null},{...user,name:''}])expect(validUser(invalid)).toBe(false);});

it('allows explicitly nullable open-cash fields without allowing null balances',()=>{expect(validResource('/cash-sessions',{items:[{id:1,opening_cents:0,expected_cents:0,counted_cents:null,difference_cents:null}],total:1,page:1,page_size:20})).toBe(true);expect(validResource('/accounts',[{id:1,name:'Fixture',opening_cents:0,balance_cents:null}])).toBe(false);});

it('DRE preserves unavailable versus confirmed zero and rejects false final totals',()=>{
 const report={margins:{LL:{value:null,reason:'Incompleto'}},source_fingerprint:'0'.repeat(64),lines:[{code:'LL',known_amount_cents:null,final_amount_cents:null,coverage_status:'unavailable'}],facts:[],issues:[]};
 expect(validResource('/finance/dre',report)).toBe(true);
 expect(validResource('/finance/dre',{...report,lines:[{code:'LL',known_amount_cents:0,final_amount_cents:0,coverage_status:'complete'}]})).toBe(true);
 expect(validResource('/finance/dre',{...report,lines:[{code:'LL',known_amount_cents:0,final_amount_cents:0,coverage_status:'partial'}]})).toBe(false);
 expect(validResource('/finance/dre',{...report,lines:[{code:'DA',known_amount_cents:0,final_amount_cents:0,coverage_status:'not_applicable'}]})).toBe(true);
 expect(validResource('/finance/dre',{})).toBe(false);
 expect(validResource('/finance/dre',{...report,facts:[{key:'source',amount_cents:'0',economic_date:'2026-11-08'}]})).toBe(false);
});
