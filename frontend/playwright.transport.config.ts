import { defineConfig } from '@playwright/test';
import {existsSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
const brave='/snap/brave/current/opt/brave.com/brave/brave';
const cache=join(homedir(),'.cache','ms-playwright');
const firefox=existsSync(cache)?readdirSync(cache).filter(p=>p.startsWith('firefox-')).map(p=>join(cache,p,'firefox','firefox')).find(existsSync):undefined;
export default defineConfig({testDir:'./tests',testMatch:'transport-module.spec.ts',workers:1,retries:0,timeout:30000,reporter:'list',outputDir:'test-results-transport',use:{baseURL:'http://127.0.0.1:8024',trace:'off',screenshot:'off'},projects:[
 {name:'chromium-desktop',use:{browserName:'chromium',viewport:{width:1440,height:900},launchOptions:{executablePath:process.env.GESTAO_CHROMIUM_PATH||brave}}},
 {name:'chromium-mobile',use:{browserName:'chromium',viewport:{width:375,height:812},launchOptions:{executablePath:process.env.GESTAO_CHROMIUM_PATH||brave}}},
 ...(firefox?[{name:'firefox-desktop',use:{browserName:'firefox' as const,viewport:{width:1440,height:900},launchOptions:{executablePath:firefox}}}]:[])
]});
