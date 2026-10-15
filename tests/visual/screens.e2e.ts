import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import path from 'node:path';
import { compareScreenshot } from './screenshot';
import { memberDatabase, VISUAL_NOW, VISUAL_TOKEN } from './seed';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
];
const pages = [
  { name: 'welcome', route: '/welcome', ready: 'welcome-sign-up', member: false },
  { name: 'sign-in', route: '/sign-in', ready: 'sign-in-submit', member: false },
  { name: 'sign-up', route: '/sign-up', ready: 'sign-up-submit', member: false },
  { name: 'home', route: '/', ready: 'balance-amount', member: true },
  { name: 'cards', route: '/cards', ready: 'get-debit-card', member: true },
  { name: 'activity', route: '/activity', ready: 'screen-content', member: true },
  { name: 'profile', route: '/profile', ready: 'profile-name', member: true },
  { name: 'people', route: '/people', ready: 'friend-toggle-ava-chen', member: true },
  { name: 'merchants', route: '/merchants', ready: 'merchant-m_bloom', member: true },
  { name: 'settings', route: '/settings', ready: 'settings-verify', member: true },
];

for (const viewport of viewports) {
  for (const page of pages) {
    test(`${viewport.name} ${page.name}`, { tags: ['visual'] }, async ({ app, browser, screen }) => {
      await browser.setViewport({ width: viewport.width, height: viewport.height });
      // Pin the existing demo portraits so CDN availability and re-encoding
      // cannot alter a baseline. Unknown portrait URLs fail instead of masking changes.
      await browser.route('https://images.unsplash.com/**', async (route) => {
        const photo = path.basename(new URL(route.request.url).pathname);
        await route.fulfill({
          path: path.resolve('tests/visual/fixtures/portraits', `${photo}.jpg`),
          contentType: 'image/jpeg',
        });
      });
      await browser.addInitScript((now) => {
        const NativeDate = Date;
        class FixedDate extends NativeDate {
          constructor(...args: [] | [string | number]) {
            super(args.length ? args[0] : now);
          }
          static now() { return now; }
        }
        window.Date = FixedDate as DateConstructor;
      }, VISUAL_NOW);

      if (page.member) {
        await app.open('/welcome');
        await expect(screen.getByTestId('welcome-sign-up')).toBeVisible();
        await browser.evaluate(async ({ bytes, token }) => {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open('demo-finance', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('database');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const store = request.result;
              const transaction = store.transaction('database', 'readwrite');
              transaction.objectStore('database').put(new Uint8Array(bytes), 'sqlite');
              transaction.oncomplete = () => { store.close(); resolve(); };
              transaction.onerror = () => { store.close(); reject(transaction.error); };
              transaction.onabort = () => { store.close(); reject(transaction.error); };
            };
          });
          localStorage.setItem('testerpay.session-token', token);
          return true;
        }, { bytes: await memberDatabase(), token: VISUAL_TOKEN });
      }

      await app.open(page.route);
      await expect(browser).toHaveURL(page.route);
      await expect(screen.getByTestId(page.ready)).toBeVisible();
      await expect(screen.getByRole('progressbar')).toHaveCount(0);
      if (page.name === 'activity') {
        await expect(screen.getByText('No activity yet')).toBeVisible();
      }
      if (page.name === 'home') {
        await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');
        await expect(screen.getByTestId('feed-item-seed_t1')).toBeVisible();
      }
      await browser.evaluate(async () => {
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
          nextjs-portal { display: none !important; }
        `;
        document.head.append(style);
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
        return true;
      });
      await browser.mouse.move(0, 0);
      await compareScreenshot(app, `${viewport.name}-${page.name}`);
    });
  }
}
