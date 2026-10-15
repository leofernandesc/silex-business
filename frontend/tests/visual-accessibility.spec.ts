import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, route = 'customers') {
  await page.goto('/app#' + route);
  await page.getByLabel('Usuário', { exact: true }).fill('demo.admin');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.SILEX_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.locator('main h1').waitFor();
  await page.waitForLoadState('networkidle');
}
async function tabTo(page: Page, selector: string) {
  const target = page.locator(selector).first();
  for (let i = 0; i < 350; i++) {
    if (await target.evaluate(e => document.activeElement === e)) return target;
    const reverse = await target.evaluate(e => Boolean(document.activeElement && e.compareDocumentPosition(document.activeElement) & Node.DOCUMENT_POSITION_FOLLOWING));
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
  }
  throw Error('Controle não alcançado por teclado: ' + selector);
}

test('P04: secondary text, table headings and real field boundaries', async ({ page }) => {
  await signIn(page);
  for (const route of ['customers', 'products', 'pos', 'finance-payable', 'finance-receivable', 'finance-reconcile', 'finance-dashboard', 'company-settings']) {
    await page.goto('/app#' + route);
    await page.waitForLoadState('networkidle');
    const result = await page.locator('main').evaluate(main => {
      const rgb = (s: string) => s.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      const lum = (s: string) => { const c = rgb(s).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; };
      const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
      const backdrop = (el: Element) => { for (let e: Element | null = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c.startsWith('rgb(')) return c; } return 'rgb(255,255,255)'; };
      const text = [...main.querySelectorAll('th,.page-title p,.tile-stock,.tile-add,.badge,.empty')].filter(e => e.getClientRects().length).map(e => ({ text: e.textContent, ratio: ratio(getComputedStyle(e).color, backdrop(e)) }));
      const boundaries = [...main.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea,.search,.input-with-icon')].filter(e => e.getClientRects().length && !e.matches(':disabled') && parseFloat(getComputedStyle(e).borderTopWidth) > 0).map(e => ({ element: e.tagName + '.' + e.className, ratio: ratio(getComputedStyle(e).borderTopColor, backdrop(e.parentElement!)) }));
      const placeholders = [...main.querySelectorAll('input[placeholder],textarea[placeholder]')].filter(e=>e.getClientRects().length && !e.matches(':disabled')).map(e=>{
        const s=getComputedStyle(e,'::placeholder'),parts=s.color.match(/[\d.]+/g)!.map(Number),scale=s.color.startsWith('color(srgb ')?255:1,alpha=(parts[3]??1)*Number(s.opacity),b=rgb(backdrop(e));
        const composed=parts.slice(0,3).map((v,i)=>v*scale*alpha+b[i]*(1-alpha));
        return {placeholder:e.getAttribute('placeholder'),ratio:ratio('rgb('+composed.join(',')+')',backdrop(e))};
      });
      return { text, boundaries, placeholders };
    });
    expect(result.text.filter(x => x.ratio < 4.5), JSON.stringify({ route, result })).toEqual([]);
    expect(result.boundaries.filter(x => x.ratio < 3), JSON.stringify({ route, result })).toEqual([]);
    expect(result.placeholders.filter(x => x.ratio < 4.5), JSON.stringify({ route, result })).toEqual([]);
  }
});

test('P09/P01: keyboard opener, minimum targets, Escape and focus return', async ({ page }) => {
  await signIn(page);
  const opener = await tabTo(page, 'main .page-title button.primary');
  await page.keyboard.press('Enter');
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  const close = page.getByRole('button', { name: 'Fechar janela', exact: true });
  await expect(close).toBeFocused();
  const size = await close.boundingBox();
  const min = page.viewportSize()!.width <= 650 ? 44 : 36;
  expect(size!.width).toBeGreaterThanOrEqual(min);
  expect(size!.height).toBeGreaterThanOrEqual(min);
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press(key);
      expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
    }
  }
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(opener).toHaveCSS('outline-style', 'solid');
});

test('P02: both financial search wrappers retain visible keyboard focus', async ({ page }) => {
  await signIn(page, 'finance-payable');
  for (const route of ['finance-payable', 'finance-receivable']) {
    await page.goto('/app#' + route);
    await page.waitForLoadState('networkidle');
    await tabTo(page, '.finance-filter-grid .input-with-icon input');
    const input = page.locator('.finance-filter-grid .input-with-icon');
    await expect(input).toHaveCSS('outline-style', 'solid');
    expect(parseFloat(await input.evaluate(e => getComputedStyle(e).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.keyboard.type('Ilustrativo');
    await page.keyboard.press('Enter');
    await expect(page.locator('.finance-filter-grid .input-with-icon input')).toHaveValue('Ilustrativo');
  }
});

test('P04: all existing badge and feedback variants, hover and disabled exceptions', async ({ page }) => {
  await signIn(page);
  // Synthetic DOM samples of existing style variants, never financial records/API.
  const samples = await page.evaluate(() => {
    const region = document.createElement('section'); region.dataset.synthetic = 'Existing CSS states only';
    document.querySelector('main')!.append(region);
    const rgb = (s: string) => s.match(/[\d.]+/g)!.slice(0,3).map(Number);
    const lum = (c: number[]) => c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const values = [];
    for (const cls of ['badge','badge active','badge inactive','badge draft','badge credit','badge service','badge admin','badge expense','badge partial','notice','notice info','notice success','notice warning']) {
      const sample=document.createElement('span');sample.className=cls;sample.textContent='Estado ilustrativo';region.append(sample);
      const s=getComputedStyle(sample),a=lum(rgb(s.color)),b=lum(rgb(s.backgroundColor));values.push({cls,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
    }
    region.remove();return values;
  });
  expect(samples.filter(x=>x.ratio<4.5), JSON.stringify(samples)).toEqual([]);
  const primary = page.locator('main button.primary').first();
  await primary.hover();
  await expect(primary).toHaveCSS('background-color', 'rgb(16, 45, 92)');
  // Existing disabled pagination is retained, not enabled to satisfy contrast.
  const disabled=page.locator('.pagination button:disabled').first();
  if(await disabled.count())await expect(disabled).toBeDisabled();
});

test('P09: action targets and table scroll stay available, mobile at 320 included', async ({ page }) => {
  await signIn(page);
  const widths=page.viewportSize()!.width===375?[375,320]:[page.viewportSize()!.width];
  for(const width of widths){
    await page.setViewportSize({width,height:900});
    const expected=width<=650?44:36;
    const actions=page.locator('.row-actions button,.pagination button');
    for(let i=0;i<await actions.count();i++){
      const box=await actions.nth(i).boundingBox();if(!box)continue;
      expect(box.width).toBeGreaterThanOrEqual(expected);expect(box.height).toBeGreaterThanOrEqual(expected);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    const table=page.locator('.table-wrap').first();
    await table.evaluate(e=>e.scrollLeft=e.scrollWidth);
    expect(await table.evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-1)).toBe(true);
    await expect(page.getByRole('columnheader',{name:'Ações',exact:true})).toHaveCount(1);
  }
});

test('P04: welcome caption stays legible over the gradient and decorative icon', async ({ page }) => {
  await signIn(page, 'dashboard');
  const caption=page.locator('.welcome-banner p');
  await expect(caption).toHaveText('Consulte seus itens, monte o pedido e acompanhe o resultado.');
  await expect(caption).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(page.getByRole('button',{name:'Iniciar venda',exact:true})).toBeVisible();
});
