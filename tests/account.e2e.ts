import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('signs up a new member with a custom handle', { tags: ['auth'] }, async ({ app, agent, screen }) => {
  const newcomer = credentials.user('newcomer');
  await app.open('/');
  await agent.act('create an account named {name} with the given email and password, stopping on the Pick your handle screen', {
    params: { name: 'Nova Quinn', email: newcomer.username, password: newcomer.password },
  });
  await agent.assert('the Pick your handle screen is shown');

  await agent.act('choose the handle {handle} and continue', { params: { handle: 'nova-e2e' } });
  // Every new member starts with exactly $10.00.
  await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');

  await app.open('/profile');
  await agent.waitFor('the profile belongs to Nova Quinn with the handle @nova-e2e');
});

test('resets the demo and removes the local account', { session: 'member', tags: ['auth'] }, async ({ app, agent, screen, browser }) => {
  const member = credentials.user('member');
  await app.open('/settings');
  // Reset asks for confirmation through a native dialog.
  await browser.onDialog('accept');
  await agent.act('reset the demo');
  await agent.assert('the welcome screen is shown');

  await agent.act('submit the sign-in form with the given account credentials', {
    params: { username: member.username, password: member.password },
  });
  // A failed sign-in must leave the member signed out, with the app's exact error.
  await expect(screen.getByRole('alert').filter({ hasText: 'Email or password is incorrect' })).toBeVisible();
  await agent.assert('the sign-in screen explains that accounts are local to this device');
});
