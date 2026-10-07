import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('signs up a new member with a custom handle', { tags: ['auth'] }, async ({ app, agent, screen, web }) => {
  const newcomer = credentials.user('newcomer');
  await app.open('/');
  await agent.act('create an account named {name} with the given email and password, and stop on the Pick your handle screen', {
    params: { name: 'Nova Quinn', email: newcomer.username, password: newcomer.password },
  });
  await expect(web).toHaveURL('/onboarding/handle');

  await agent.act('choose the handle {handle} and continue', { params: { handle: 'nova-e2e' } });
  await expect(web).toHaveURL('/');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');

  await app.open('/profile');
  await expect(screen.getByTestId('profile-name')).toHaveText('Nova Quinn');
  await expect(screen.getByTestId('profile-handle')).toContainText('@nova-e2e');
});

test('resets the demo and removes the local account', { session: 'member', tags: ['auth'] }, async ({ app, agent, screen, web }) => {
  const member = credentials.user('member');
  await app.open('/settings');
  // Reset asks for confirmation through a native dialog.
  web.onDialog('accept');
  await agent.act('reset the demo');
  await expect(web).toHaveURL('/welcome');

  await agent.act('try to sign in with the given credentials and stop once the app responds', {
    params: { username: member.username, password: member.password },
  });
  await expect(screen.getByText('Email or password is incorrect', { exact: false })).toBeVisible();
  await expect(web).toHaveURL('/sign-in');
});
