import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const identity = { dateOfBirth: '1990-08-21', ssnLast4: '5678', streetAddress: '42 Elm Street' };

describe('cards', { session: 'member', tags: ['cards'] }, () => {
  test('verifies identity and is approved for the credit card', async ({ app, agent, screen }) => {
    await app.open('/cards');
    await agent.act('start the credit card application, stopping on the Verify identity screen');
    await agent.assert('the Verify identity screen is shown');

    await agent.act("verify identity with the given details, stopping on the You're verified screen", { params: identity });
    await agent.assert("the screen says You're verified");

    await agent.act('continue to the card, stopping before agreeing to the terms');
    await agent.assert('the credit card application asks to agree to the cardholder terms');

    await agent.act('agree to the cardholder terms and submit the application');
    await agent.assert('the screen says the credit card application was approved');

    await app.open('/cards');
    // The limit is money: check the exact figure, let the agent judge the rest of the screen.
    await expect(screen.getByTestId('open-credit-card')).toContainText('Limit $3,000');
    await agent.waitFor('the Cards screen shows an open credit card and still offers the debit card');

    await app.open('/profile');
    await agent.waitFor('the profile shows the identity as verified');
  });

  test('manages debit card controls', async ({ app, agent, screen }) => {
    await app.open('/cards');
    await agent.act('start getting the debit card, stopping on the Verify identity screen');
    await agent.assert('the Verify identity screen is shown');

    await agent.act("verify identity with the given details, stopping on the You're verified screen", { params: identity });
    await agent.assert("the screen says You're verified");

    await agent.act('continue to the card and create it with the Midnight design');
    await agent.assert('the screen says the debit card is ready');
    // Only the pixels show that the card art really uses the chosen design.
    await agent.assert('the debit card artwork at the top uses the dark Midnight design', { vision: true });

    await agent.act('set the daily spend limit to {limit}', { params: { limit: '$1,000' } });
    await expect(screen.getByText('Currently $1,000')).toBeVisible();

    await agent.act('order the physical card');
    await agent.assert('the physical card is on the way and can be activated');

    await agent.act('activate the physical card');
    await agent.assert('the physical card is activated');

    await agent.act('lock the card using the Lock card switch in Controls');
    await expect(screen.getByRole('switch', 'Lock card')).toBeChecked();
    await agent.assert('the controls say purchases are blocked');

    await app.open('/cards');
    await expect(screen.getByTestId('open-debit-card')).toContainText('Locked · Spend limit $1,000/day');
  });
});
