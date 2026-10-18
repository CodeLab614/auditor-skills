import type { Page } from '@playwright/test';

export async function installTestTurnstileWidget(page: Page) {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
        (() => {
          let nextId = 0;
          window.turnstile = {
            render(_container, options) {
              const id = String(++nextId);
              setTimeout(() => options.callback('e2e-turnstile-test-token'), 300);
              return id;
            },
            reset() {},
            remove() {},
          };
        })();
      `,
    }),
  );
}
