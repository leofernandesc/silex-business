import { test, expect } from "./integrationTest";
import { expectDate } from "./dateHelpers";
const boundaries = [
  {
    instant: "2026-11-01T02:30:00Z",
    day: "2026-10-31",
    week: "2026-10-26",
    month: "2026-10-01",
    previous: ["2026-09-01", "2026-09-30"],
    year: "2026-01-01",
  },
  {
    instant: "2027-01-01T03:59:59Z",
    day: "2026-12-31",
    week: "2026-12-28",
    month: "2026-12-01",
    previous: ["2026-11-01", "2026-11-30"],
    year: "2026-01-01",
  },
  {
    instant: "2027-01-01T04:00:00Z",
    day: "2027-01-01",
    week: "2026-12-28",
    month: "2027-01-01",
    previous: ["2026-12-01", "2026-12-31"],
    year: "2027-01-01",
  },
  {
    instant: "2024-03-01T04:00:00Z",
    day: "2024-03-01",
    week: "2024-02-26",
    month: "2024-03-01",
    previous: ["2024-02-01", "2024-02-29"],
    year: "2024-01-01",
  },
];
test("real browser timezone boundaries preserve ISO presets and reloaded criteria", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { username: "demo.admin", password: "DemoLocal#2026" },
      })
    ).ok(),
  ).toBe(true);
  const expectedZone = info.project.name;
  expect(
    await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
  ).toBe(expectedZone);
  for (const b of boundaries) {
    await page.clock.setFixedTime(new Date(b.instant));
    let last: URL | null = null;
    const listener = (request: any) => {
      const u = new URL(request.url());
      if (u.pathname === "/api/finance") last = u;
    };
    page.on("request", listener);
    await page.goto("/app#finance-payable");
    for (const [label, start, end] of [
      ["Hoje", b.day, b.day],
      ["Semana", b.week, b.day],
      ["Mês", b.month, b.day],
      ["Mês anterior", ...b.previous],
      ["Ano", b.year, b.day],
    ]) {
      await page
        .getByLabel("Período rápido")
        .getByRole("button", { name: label, exact: true })
        .click();
      await expect.poll(() => last?.searchParams.get("start")).toBe(start);
      await expect.poll(() => last?.searchParams.get("end")).toBe(end);
      await expectDate(page, "De", start);
      await expectDate(page, "Até", end);
    }
    await page.reload();
    await expectDate(page, "De", b.year);
    await expectDate(page, "Até", b.day);
    page.off("request", listener);
    await page.goto("/app#finance");
    await page
      .getByLabel("Período", { exact: true })
      .getByRole("button", { name: "Hoje", exact: true })
      .click();
    await expectDate(page, "De", b.day);
    await expectDate(page, "Até", b.day);
  }
});
