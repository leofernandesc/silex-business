import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const username = process.env.SILEX_TEST_USERNAME || "demo.admin";
const password = process.env.SILEX_TEST_PASSWORD;
const evidence = process.env.SILEX_SB07B_EVIDENCE;

test("prepara a homologação da legenda brasileira sem gravar dados", async ({ page, browser }) => {
  expect(password, "Defina SILEX_TEST_PASSWORD com a credencial local de demonstração").toBeTruthy();
  const writes: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method()) && url.pathname !== "/api/auth/login") {
      writes.push(`${request.method()} ${url.pathname}`);
    }
  });

  await page.goto("/entrar");
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Página inicial", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/app#service-orders");
  await expect(page.getByRole("heading", { name: "Serviços e pedidos", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Novo serviço/pedido", exact: true }).click();

  const date = page.getByLabel("Data do serviço *", { exact: true });
  await expect(date).toHaveAttribute("type", "date");
  await expect(date).toHaveAttribute("lang", "pt-BR");
  await expect(date).toHaveValue("");
  const descriptionId = await date.getAttribute("aria-describedby");
  expect(descriptionId).toBeTruthy();
  await expect(page.locator(`[id="${descriptionId}"]`)).toHaveText("Formato brasileiro: dd/mm/aaaa");
  const requiredEmptyValidity = await date.evaluate((element: HTMLInputElement) => element.validity.valueMissing);
  expect(requiredEmptyValidity).toBe(true);

  await page.getByLabel("Descrição do serviço/pedido *", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(date).toBeFocused();
  await date.fill("2026-03-04");
  await expect(page.locator(`[id="${descriptionId}"]`)).toHaveText("Data: 04/03/2026");
  await expect(date).toHaveValue("2026-03-04");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

  if (evidence) {
    mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: `${evidence}/services-date-pt-BR-375.png`, fullPage: true });
    const metadata = await page.evaluate((captionId) => {
      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      return {
      locale: navigator.language,
      pageLanguage: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight },
      inputType: input.type,
      inputValue: input.value,
      caption: document.querySelector(`[id="${captionId}"]`)?.textContent,
      requiredEmptyValidity,
      };
    }, descriptionId);
    writeFileSync(`${evidence}/preparation.json`, JSON.stringify({ browser: browser.version(), ...metadata, writeRequests: writes, humanEvaluation: "not performed" }, null, 2));
  }
  expect(writes, "Este preparo não deve salvar serviços nem títulos").toEqual([]);
});
