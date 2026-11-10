import { test } from '@e2e-dev/web';
import { credentials } from 'e2e';

test('signs up a new member with a custom handle', { tags: ['auth'] }, async ({ app, agent }) => {
  const newcomer = credentials.user('newcomer');
  await app.open('/');
  await agent.act('create an account named {name} with the given email and password, stopping on the Pick your handle screen', {
    params: { name: 'Nova Quinn', email: newcomer.username, password: newcomer.password },
  });
  await agent.assert('the Pick your handle screen is shown');

  await agent.act('choose the handle {handle} and continue', { params: { handle: 'nova-e2e' } });
  await agent.assert('the home dashboard shows a TesterPay balance of $10.00');

  await app.open('/profile');
  await agent.waitFor('the profile belongs to Nova Quinn with the handle @nova-e2e');
});

test('resets the demo and removes the local account', { session: 'member', tags: ['auth'] }, async ({ app, agent, browser }) => {
  const member = credentials.user('member');
  await app.open('/settings');
  // Reset asks for confirmation through a native dialog.
  await browser.onDialog('accept');
  await agent.act('reset the demo');
  await agent.assert('the welcome screen is shown');

  await agent.act('submit the sign-in form with the given account credentials', {
    params: { username: member.username, password: member.password },
  });
  await agent.assert('the sign-in screen says the email or password is incorrect');
});
