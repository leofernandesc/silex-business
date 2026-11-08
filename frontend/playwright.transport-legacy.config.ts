import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'customer-details.spec.ts',reporter:'list',outputDir:'test-results-transport-legacy',retries:0,use:{baseURL:'http://127.0.0.1:8011',browserName:'chromium',launchOptions:{executablePath:process.env.GESTAO_CHROMIUM_PATH||'/snap/brave/current/opt/brave.com/brave/brave'},trace:'off',screenshot:'off'},projects:[
 {name:'desktop',use:{viewport:{width:1440,height:900}}},
 {name:'mobile',use:{viewport:{width:375,height:812}}},
]});
