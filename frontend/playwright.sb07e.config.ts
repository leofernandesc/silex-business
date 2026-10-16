import { defineConfig } from '@playwright/test';
import original from './playwright.config';
const chromium=Boolean(process.env.SILEX_SB07E_CHROMIUM);
export default defineConfig({
 ...original,webServer:undefined,retries:0,
 testMatch:process.env.SILEX_SB07E_MATCH?.split(',')||['home.spec.ts','navigation.spec.ts','modal-workflows.spec.ts','public.spec.ts','date-presentation.spec.ts'],
 projects:[{name:chromium?'chromium':'firefox',use:chromium?{browserName:'chromium',launchOptions:{executablePath:'/snap/brave/current/opt/brave.com/brave/brave',args:['--no-sandbox']},viewport:{width:1440,height:900}}:original.projects![0].use}],
 use:{...original.use,baseURL:'http://127.0.0.1:8011'},
 reporter:[['list'],['json',{outputFile:process.env.SILEX_SB07E_RESULTS||'../docs/evidence/sb07e/e2e-results.json'}]],
 outputDir:process.env.SILEX_SB07E_OUTPUT||'test-results-sb07e',
});
