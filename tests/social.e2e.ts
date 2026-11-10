import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { z } from 'zod';

describe('people and profile', { session: 'member', tags: ['social'] }, () => {
  test('edits the display name and bio', async ({ app, agent, screen }) => {
    await app.open('/profile');
    await agent.act('edit the profile to set the display name to {name} and the bio to {bio}, then save', {
      params: { name: 'Edie Tester', bio: 'Testing all the flows' },
    });
    await agent.assert('the profile shows the name Edie Tester and the bio Testing all the flows');
    // The handle chosen at onboarding does not change with the display name.
    await expect(screen.getByTestId('profile-handle')).toHaveText('@e2e-member');
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

  test('pays privately with a note and emoji', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('prepare a payment to Marcus Reed for {amount} from the balance with the note {note}, pick the {emoji} emoji button below the note, choose Private visibility, and open the payment confirmation without confirming it', {
      params: { amount: '$2', note: 'E2E pizza', emoji: '🍕' },
    });
    await agent.assert('the payment confirmation shows $2.00 to Marcus Reed with the note 🍕 E2E pizza and Private visibility');

    await agent.act('confirm the payment');
    await agent.assert('a success screen says You paid Marcus Reed');

    await agent.act('view the payment details');
    const payment = await agent.extract('the payment amount, the note with its emoji, and the visibility', {
      schema: z.object({ amount: z.string(), note: z.string(), visibility: z.string() }),
    });
    expect(payment).toMatchObject({ note: '🍕 E2E pizza', visibility: 'Private' });
    expect(payment.amount).toContain('$2.00');
    await expect(screen.getByTestId('detail-amount')).toHaveText('- $2.00');
  });

  test('declines the incoming request', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('open the Movie snacks request from Marcus Reed');
    await agent.assert('the request details show Marcus Reed asking for Movie snacks');

    await agent.act('decline the request');
    await expect(screen.getByTestId('request-status')).toHaveText('Declined');

    await app.open('/');
    // New members start with two requests; only Ava's dinner request is left.
    await agent.waitFor('the home dashboard shows one request for you, for Dinner last week, and no Movie snacks request');
    // Declining moves no money.
    await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');
  });

  test('creates a QR code that requests a set amount', async ({ app, agent, screen }) => {
    await app.open('/qr');
    await agent.act('open the Request a set amount form, stopping before entering anything');
    await agent.assert('a form asks for the amount to request and a note');

    await agent.act('enter the amount {amount}', { params: { amount: '7.50' } });
    await expect(screen.getByTestId('amount-display')).toHaveText('7.50');

    await agent.act('add the note {note} and create the code', { params: { note: 'E2E book club' } });
    await agent.assert('a request code is shown for $7.50 with the note E2E book club');
    // The QR code is an SVG drawing: the text snapshot can't tell if it rendered.
    await agent.assert('the card shows a rendered QR code image', { vision: true });
  });
});
