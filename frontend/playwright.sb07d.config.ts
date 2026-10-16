import { defineConfig } from '@playwright/test';
import original from './playwright.config';
export default defineConfig({
 ...original,webServer:undefined,
 testMatch:process.env.SILEX_SB07D_MATCH?.split(',')||['content-reflow.spec.ts'],
 projects:[{name:process.env.SILEX_SB07D_CHROMIUM?'chromium':'firefox',use:process.env.SILEX_SB07D_CHROMIUM?{browserName:'chromium',launchOptions:{executablePath:'/snap/brave/current/opt/brave.com/brave/brave',args:['--no-sandbox']},viewport:{width:1440,height:900}}:original.projects![0].use}],
 use:{...original.use,baseURL:process.env.SILEX_SB07D_URL||'http://127.0.0.1:18095'},
 reporter:[['list'],['json',{outputFile:process.env.SILEX_SB07D_RESULTS||'../docs/evidence/sb07d/e2e-results.json'}]],
 outputDir:process.env.SILEX_SB07D_ARTIFACTS||'test-results-sb07d',
});
