// Renderização isolada dos estudos, sem iniciar ERP/API nem acessar banco.
// Requer o servidor estático descrito no README e o Playwright já instalado.
import { createRequire } from 'node:module';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(new URL('../../../../frontend/package.json', import.meta.url));
const { firefox } = require('@playwright/test');
const cache = join(homedir(), '.cache', 'ms-playwright');
const folder = (await readdir(cache)).filter(x => x.startsWith('firefox-')).sort().at(-1);
const browser = await firefox.launch({ executablePath: join(cache, folder, 'firefox', 'firefox') });
const output = new URL('../renders/', import.meta.url);
await mkdir(output, { recursive: true });
const observations = [];
for (const [size, width, height] of [['desktop',1440,900],['tablet',768,1024],['mobile',375,812]]) {
  for (const pageName of ['a-publica','b-login','c-inicial','d-lancamentos']) {
    const page = await browser.newPage({ viewport: { width, height } });
    const requests = [], errors = [];
    page.on('request', r => requests.push(r.url()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:8031/${pageName}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const rendering = await page.evaluate(() => ({
      larguraViewport: innerWidth,
      larguraDocumento: document.documentElement.scrollWidth,
      alturaDocumento: document.documentElement.scrollHeight,
      inter400: document.fonts.check('400 14px Inter'),
      inter600: document.fonts.check('600 14px Inter'),
      imagensNaoCarregadas: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
      tabelas: [...document.querySelectorAll('.table-scroll')].map(t => ({conteudo:t.scrollWidth,container:t.clientWidth})),
      tabelasVendas: [...document.querySelectorAll('.mini-sales-scroll')].map(t => ({conteudo:t.scrollWidth,container:t.clientWidth})),
      datas: [...document.querySelectorAll('.date-control input')].map(t => ({id:t.id,apresentacao:t.value,iso:t.dataset.iso,readonly:t.readOnly})),
      orientacaoRolagem: [...document.querySelectorAll('.table-scroll-hint')].map(t => ({texto:t.textContent.trim(),visivel:getComputedStyle(t).display!=='none'})),
      botaoNovaDespesa: [...document.querySelectorAll('.actions button')].filter(t => t.textContent.includes('Nova despesa')).map(t => ({classe:t.className,cor:getComputedStyle(t).color,fundo:getComputedStyle(t).backgroundColor})),
      colunasFinanceiras: document.querySelectorAll('.table-scroll th').length,
      acoesEstornar: [...document.querySelectorAll('.table-scroll button')].filter(t => t.textContent==='Estornar').length,
      colunasLogin: document.querySelector('.login-layout') ? getComputedStyle(document.querySelector('.login-layout')).gridTemplateColumns : null,
      titulo: document.querySelector('h1')?.textContent,
    }));
    await page.screenshot({ path: new URL(`${pageName}-${size}.png`, output).pathname, fullPage: true });
    if (pageName === 'd-lancamentos' && width <= 900) {
      const region = page.locator('.table-scroll');
      await region.evaluate(t => { t.scrollLeft = t.scrollWidth; });
      rendering.ultimaColuna = await region.evaluate(t => {
        const box = t.getBoundingClientRect(), cell = t.querySelector('tbody tr td:last-child').getBoundingClientRect();
        return { scrollLeft:t.scrollLeft, todasColunas:t.querySelectorAll('th').length, acoesVisiveis:cell.left>=box.left && cell.right<=box.right+1 };
      });
      await page.locator('.table-panel').screenshot({ path:new URL(`${pageName}-${size}-ultima-coluna.png`,output).pathname });
    }
    observations.push({ pagina: pageName, tamanho: size, ...rendering, requests, errors });
    await page.close();
  }
}
await browser.close();
await writeFile(new URL('../renderizacao.json', import.meta.url), JSON.stringify(observations, null, 2)+'\n');
console.log(JSON.stringify(observations.map(({requests,...x}) => ({...x,requests:requests.length})), null, 2));
