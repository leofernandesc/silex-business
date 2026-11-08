import {defineConfig} from '@playwright/test';
const firefox=process.env.SILEX_INTEGRATION_BROWSER==='firefox';
const executable=firefox?process.env.GESTAO_FIREFOX_PATH:process.env.SILEX_CHROMIUM_PATH;
export default defineConfig({testDir:'./tests',testMatch:'transport-module.spec.ts',workers:1,retries:0,timeout:30000,reporter:'list',outputDir:'test-results-transport',use:{baseURL:'http://127.0.0.1:8024',browserName:firefox?'firefox':'chromium',launchOptions:executable?{executablePath:executable}:{},trace:'off',screenshot:'off'},projects:[
 {name:'desktop',use:{viewport:{width:1440,height:900}}},
 {name:'mobile',use:{viewport:{width:375,height:812}}}
]});
