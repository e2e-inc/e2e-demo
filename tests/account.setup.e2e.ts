import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test.setup('create a member account', { sessions: ['member'] }, async ({ app, screen, session, browser }) => {
  const member = credentials.user('member');
  await app.open('/');
  await expect(screen.getByTestId('welcome-sign-up')).toBeVisible();
  await screen.getByTestId('welcome-sign-up').tap();
  await screen.getByLabel('Full name').fill('E2E Member');
  await screen.getByLabel('Email').fill(member.username);
  await screen.getByLabel('Password').fill(member.password);
  await screen.getByTestId('sign-up-submit').tap();

  await expect(browser).toHaveURL('/onboarding/handle');
  await expect(screen.getByTestId('handle-hint')).toContainText('@e2e-member is available');
  await screen.getByTestId('handle-submit').tap();
  await expect(browser).toHaveURL('/');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');
  await session.save('member');
});
