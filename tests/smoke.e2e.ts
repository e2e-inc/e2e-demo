import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Model-free: these two tests are the Doctor in .agents/skills/verify-testerpay-next.
test('signed out, the app lands on the welcome screen', { tags: ['doctor'] }, async ({ app, screen, browser }) => {
  await app.open('/');
  await expect(browser).toHaveURL('/welcome');
  await expect(screen.getByTestId('welcome-sign-up')).toBeVisible();
  await expect(screen.getByTestId('welcome-sign-in')).toBeVisible();
});

test('the member session restores onto the home dashboard', { session: 'member', tags: ['doctor'] }, async ({ app, screen, browser }) => {
  await app.open('/');
  await expect(browser).toHaveURL('/');
  await expect(screen.getByTestId('home-dashboard')).toBeVisible();
  await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');
});
