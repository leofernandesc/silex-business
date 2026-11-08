import {test,expect} from './integrationTest';
import AxeBuilder from '@axe-core/playwright';
import {routes} from '../src/navigation/routes';
import {openReadyRoute} from './routeReadiness';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('accessible login, every registered authorized route and customer dialog',async({page},testInfo)=>{
 test.setTimeout(240000);
 const findings:any[]=[];
 async function audit(surface:string){const result=await new AxeBuilder({page}).analyze();findings.push({surface,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});}
 await page.goto('/entrar');await expect(page.getByLabel('Usuário',{exact:true})).toBeVisible();await audit('login');
 expect((await page.request.post('/api/auth/login',{data:{username:'transport.fixture.admin',password:'CustomerFixtureOnly#2026'}})).ok()).toBe(true);
 for(const route of routes){await openReadyRoute(page,route);await audit(route.id);}
 await page.goto('/app#customers');await page.getByRole('button',{name:'Novo cliente',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await audit('customer-dialog');
 writeFileSync(join(tmpdir(),`silex-commercial-axe-${testInfo.project.name}-${process.env.SILEX_INTEGRATION_BROWSER||'chromium'}.json`),JSON.stringify(findings,null,2));
 expect(findings.filter(f=>f.violations.length)).toEqual([]);
});
