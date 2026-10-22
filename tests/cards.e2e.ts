import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const identity = { dateOfBirth: '1990-08-21', ssnLast4: '5678', streetAddress: '42 Elm Street' };

describe('cards', { session: 'member', tags: ['cards'] }, () => {
  test('verifies identity and is approved for the credit card', async ({ app, agent, screen, browser }) => {
    await app.open('/cards');
    await agent.act("start the credit card application and verify identity with the given details, stopping on the You're verified screen", {
      params: identity,
    });
    await expect(screen.getByTestId('verify-success')).toContainText("You're verified");

    await agent.act('continue to the card and agree to the cardholder terms, stopping before submitting the application');
    await expect(screen.getByRole('checkbox', { name: 'Agree to cardholder terms' })).toBeChecked();

    await screen.getByRole('button', { name: 'Submit application' }).tap();
    await expect(browser).toHaveURL(/\/cards\/[^/]+\?fresh=1$/);
    await expect(screen.getByTestId('card-fresh-banner')).toContainText('approved');

    await app.open('/cards');
    await expect(screen.getByTestId('open-credit-card')).toContainText('Limit $3,000');
    await expect(screen.getByTestId('get-debit-card')).toBeVisible();

    await app.open('/profile');
    await expect(screen.getByText('Verified', { exact: true })).toBeVisible();
  });

  test('manages debit card controls', async ({ app, agent, screen }) => {
    await app.open('/cards');
    await agent.act('get the debit card, verifying identity with the given details, and create the card with the Midnight design', {
      params: identity,
    });
    await expect(screen.getByTestId('card-fresh-banner')).toContainText('Your card is ready');
    await expect(screen.getByRole('button', { name: 'Midnight design' })).toHaveAttribute('aria-pressed', 'true');

    await agent.act('set the daily spend limit to {limit}', { params: { limit: '$1,000' } });
    await expect(screen.getByText('Currently $1,000')).toBeVisible();

    await agent.act('order the physical card and then activate it');
    await expect(screen.getByText('Physical card activated')).toBeVisible();

    await agent.act('lock the card using the Lock card switch in Controls');
    await expect(screen.getByRole('switch', { name: 'Lock card' })).toBeChecked();
    await agent.assert('the card controls say purchases are blocked while the card is locked');

    await app.open('/cards');
    await expect(screen.getByTestId('open-debit-card')).toContainText('Locked');
    await expect(screen.getByTestId('open-debit-card')).toContainText('$1,000/day');
  });
});
