import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('signs up a new member with a custom handle', { tags: ['auth'] }, async ({ app, agent, screen, browser }) => {
  const newcomer = credentials.user('newcomer');
  await app.open('/');
  await agent.act('create an account named {name} with the given email and password, and stop on the Pick your handle screen', {
    params: { name: 'Nova Quinn', email: newcomer.username, password: newcomer.password },
  });
  await expect(browser).toHaveURL('/onboarding/handle');

  await agent.act('choose the handle {handle} and continue', { params: { handle: 'nova-e2e' } });
  await expect(browser).toHaveURL('/');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');

  await app.open('/profile');
  await expect(screen.getByTestId('profile-name')).toHaveText('Nova Quinn');
  await expect(screen.getByTestId('profile-handle')).toContainText('@nova-e2e');
});

test('resets the demo and removes the local account', { session: 'member', tags: ['auth'] }, async ({ app, screen, browser }) => {
  const member = credentials.user('member');
  await app.open('/settings');
  // Reset asks for confirmation through a native dialog.
  await browser.onDialog('accept');
  await screen.getByRole('button', { name: 'Reset demo' }).tap();
  await expect(browser).toHaveURL('/welcome');

  await screen.getByRole('link', { name: 'Already have an account? Sign in' }).tap();
  await screen.getByLabel('Email').fill(member.username);
  await screen.getByLabel('Password').fill(member.password);
  await screen.getByRole('button', { name: 'Sign in' }).tap();
  await expect(screen.getByText('Email or password is incorrect', { exact: false })).toBeVisible();
  await expect(browser).toHaveURL('/sign-in');
});
