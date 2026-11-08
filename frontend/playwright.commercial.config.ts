import {defineConfig} from '@playwright/test';
import integration from './playwright.integration.config';
export default defineConfig({...integration,testMatch:['commercial-readiness.spec.ts','commercial-a11y.spec.ts'],projects:[integration.projects![0]],reporter:[['list'],['json',{outputFile:process.env.SILEX_COMMERCIAL_REPORT || '/tmp/silex-commercial-directed.json'}]]});
