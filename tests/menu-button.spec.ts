import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

const SCENARIO = '[data-testid="scenario-root"]';

/** Runs axe against the scenario only, so site chrome doesn't add noise. */
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).include(SCENARIO).analyze();
  await test.info().attach(`axe-${label}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  return results.violations;
}

const summarize = (violations: { id: string; nodes: unknown[] }[]) =>
  violations.map((v) => `${v.id} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`);

/** Starts recording every DOM mutation inside the scenario root. */
async function watchDom(page: Page) {
  await page.evaluate((selector) => {
    const w = window as any;
    w.__mutations = [];
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as Element;
        w.__mutations.push(
          r.type === 'attributes'
            ? `attribute "${r.attributeName}" changed on <${el.tagName.toLowerCase()}>`
            : `${r.addedNodes.length} added / ${r.removedNodes.length} removed under <${el.tagName.toLowerCase()}>`,
        );
      }
    }).observe(document.querySelector(selector)!, { subtree: true, childList: true, attributes: true });
  }, SCENARIO);
}

/** Waits until at least one mutation was recorded, then returns them all. */
async function waitForDomChange(page: Page): Promise<string[]> {
  await page.waitForFunction(() => (window as any).__mutations.length > 0);
  return page.evaluate(() => (window as any).__mutations);
}

for (const variant of ['accessible', 'broken'] as const) {
  test(`menu button (${variant}): axe + ARIA before and after opening`, async ({ page }) => {
    // The broken variant is supposed to fail. If it ever passes, Playwright
    // reports that as an error, so a regression in the fixture is noticed too.
    test.fail(variant === 'broken', 'Broken variant is expected to have accessibility failures');

    // 1. Point at the site.
    await page.goto(`#/disclosure/menu?variant=${variant}`);
    await expect(page.getByTestId('scenario-root')).toHaveAttribute('data-variant', variant);
    const trigger = page.getByTestId('trigger');

    // 2. Baseline scan with the menu closed.
    const before = await scan(page, 'before');
    console.log(`[${variant}] before click:`, summarize(before));
    expect.soft(summarize(before), 'axe violations before opening').toEqual([]);

    // What NVDA needs to announce "Actions, menu button, collapsed".
    // axe can't verify most of this, so it's asserted directly.
    await expect.soft(page.getByRole('button', { name: 'Actions' }), 'button has an accessible name').toBeVisible();
    await expect.soft(trigger, 'button declares a popup menu').toHaveAttribute('aria-haspopup', /^(menu|true)$/);
    await expect.soft(trigger, 'button reports collapsed state').toHaveAttribute('aria-expanded', 'false');

    // 3. Click the menu button and detect the resulting DOM change.
    await watchDom(page);
    await trigger.click();
    const mutations = await waitForDomChange(page);
    console.log(`[${variant}] DOM changes detected:`, mutations);
    await expect(page.getByTestId('menu')).toBeVisible();

    // 4. Re-run the same scan against the new state.
    const after = await scan(page, 'after');
    console.log(`[${variant}] after click:`, summarize(after));
    expect.soft(summarize(after), 'axe violations after opening').toEqual([]);

    await expect.soft(trigger, 'button reports expanded state').toHaveAttribute('aria-expanded', 'true');
    await expect.soft(page.getByRole('menu'), 'popup is exposed as a menu').toBeVisible();
    await expect.soft(page.getByRole('menuitem'), 'items are exposed as menu items').toHaveCount(4);
    await expect.soft(page.getByRole('menuitem', { name: 'Duplicate' }), 'focus moves into the menu').toBeFocused();
  });
}
