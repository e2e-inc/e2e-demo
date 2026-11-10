import { describe, test } from '@e2e-dev/web';

describe('people and profile', { session: 'member', tags: ['social'] }, () => {
  test('edits the display name and bio', async ({ app, agent }) => {
    await app.open('/profile');
    await agent.act('edit the profile to set the display name to {name} and the bio to {bio}, then save', {
      params: { name: 'Edie Tester', bio: 'Testing all the flows' },
    });
    // The handle chosen at onboarding does not change with the display name.
    await agent.assert('the profile shows the name Edie Tester, the bio Testing all the flows, and the handle @e2e-member');
  });

  test('adds and removes a friend', async ({ app, agent }) => {
    await app.open('/people');
    await agent.act('search People for {name}', { params: { name: 'Priya Patel' } });
    await agent.assert('the search results include Priya Patel');

    await agent.act('add Priya Patel as a friend');
    await agent.assert('Priya Patel is marked as a friend');

    await app.open('/people');
    await agent.waitFor('the friends list includes Priya Patel');

    await agent.act("open Priya Patel's profile");
    await agent.assert("Priya Patel's profile is shown", { vision: true });

    await agent.act('unfriend Priya Patel');
    await agent.assert("Priya Patel's profile offers to add her as a friend");
  });

  test('pays privately with a note and emoji', async ({ app, agent }) => {
    await app.open('/');
    await agent.act('prepare a payment to Marcus Reed for {amount} from the balance with the note {note}, pick the {emoji} emoji button below the note, choose Private visibility, and open the payment confirmation without confirming it', {
      params: { amount: '$2', note: 'E2E pizza', emoji: '🍕' },
    });
    await agent.assert('the payment confirmation shows $2.00 to Marcus Reed with the note 🍕 E2E pizza and Private visibility');

    await agent.act('confirm the payment');
    await agent.assert('a success screen says You paid Marcus Reed');

    await agent.act('view the payment details');
    await agent.assert('the payment details show a private $2.00 payment with the note 🍕 E2E pizza');
  });

  test('declines the incoming request', async ({ app, agent }) => {
    await app.open('/');
    await agent.act('open the Movie snacks request from Marcus Reed');
    await agent.assert('the request details show Marcus Reed asking for Movie snacks');

    await agent.act('decline the request');
    await agent.assert('the request status is Declined');

    await app.open('/');
    // New members start with two requests; only Ava's dinner request is left.
    await agent.waitFor('the home dashboard shows one request for you, for Dinner last week, no Movie snacks request, and a TesterPay balance of $10.00');
  });

  test('creates a QR code that requests a set amount', async ({ app, agent }) => {
    await app.open('/qr');
    await agent.act('open the Request a set amount form, stopping before entering anything');
    await agent.assert('a form asks for the amount to request and a note');

    await agent.act('enter the amount {amount}', { params: { amount: '7.50' } });
    await agent.assert('the amount shown is 7.50');

    await agent.act('add the note {note} and create the code', { params: { note: 'E2E book club' } });
    await agent.assert('a request QR code is shown for $7.50 with the note E2E book club');
  });
});
