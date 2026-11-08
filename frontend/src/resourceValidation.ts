/** Shallow structural contracts for shared GET resources; monetary dashboards have stricter guards. */
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const moneyFields = (row:Record<string,unknown>) => Object.entries(row).every(([key,value])=>!key.endsWith('_cents') || ['default_rate_cents','counted_cents','difference_cents'].includes(key)&&value===null || Number.isSafeInteger(value));
const integers = (row: Record<string, unknown>, fields: string[]) => fields.every(key => Number.isSafeInteger(row[key]));
export function validResource(path: string, value: unknown): boolean {
  const name = path.split('?')[0];
  if (['/customers','/products','/suppliers','/sales','/stock-movements','/cash-sessions','/service-orders','/audit','/finance/ofx/imports','/finance/movements','/finance'].includes(name) || /^\/finance\/reports\/(?!catalog$)[^/]+$/.test(name)) {
    return object(value) && Array.isArray(value.items) && value.items.every((row:unknown)=>object(row)&&moneyFields(row)) && integers(value,['total','page','page_size']) && Number(value.total)>=0 && Number(value.page)>0 && Number(value.page_size)>0;
  }
  if (['/accounts','/categories','/subcategories','/users','/finance/budgets','/finance/reports/catalog'].includes(name) || /\/suggestions$/.test(name)) {
    if (!Array.isArray(value) || !value.every(row=>object(row)&&moneyFields(row))) return false;
    if(name==='/finance/reports/catalog')return value.every(row=>typeof row.id==='string'&&typeof row.name==='string');
    if(['/users','/categories','/subcategories'].includes(name))return value.every(row=>integers(row,['id'])&&typeof row.name==='string');
    if(name.endsWith('/suggestions'))return value.every(row=>object(row.entry)&&integers(row.entry,['id','remaining_cents'])&&integers(row,['difference_cents']));
    if(name==='/accounts')return value.every(row=>integers(row,['id','opening_cents','balance_cents'])&&typeof row.name==='string');
    return true;
  }
  if(name==='/cash-sessions/current')return value===null || object(value) && integers(value,['id','opening_cents','expected_cents']) && typeof value.status==='string';
  if(name==='/dashboard')return object(value)&&integers(value,['sales_today_cents','sales_today_count','sales_month_cents','active_products'])&&Array.isArray(value.recent_sales)&&Array.isArray(value.low_stock);
  if(name==='/company-settings')return object(value)&&['brand_name','company_name','company_document','phone','email','address'].every(k=>typeof value[k]==='string');
  return object(value) || Array.isArray(value);
}

/** Authentication responses must be usable identities, never truthy placeholder objects. */
export function validUser(value:unknown): value is import('./types').User {
  return object(value)&&integers(value,['id'])&&Number(value.id)>0&&typeof value.name==='string'&&!!value.name.trim()&&typeof value.username==='string'&&!!value.username.trim()&&['admin','operator'].includes(String(value.role))&&value.active===true&&Array.isArray(value.capabilities)&&value.capabilities.every(c=>typeof c==='string');
}
