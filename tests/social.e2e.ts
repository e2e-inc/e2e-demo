import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test.describe('people and profile', { session: 'member', tags: ['social'] }, () => {
  test('edits the display name and bio', async ({ app, agent, screen }) => {
    await app.open('/profile');
    await agent.act('edit the profile: set the display name to {name} and the bio to {bio}, then save', {
      params: { name: 'Edie Tester', bio: 'Testing all the flows' },
    });
    await expect(screen.getByTestId('profile-name')).toHaveText('Edie Tester');
    await expect(screen.getByText('Testing all the flows')).toBeVisible();
    // The handle chosen at onboarding does not change with the display name.
    await expect(screen.getByTestId('profile-handle')).toContainText('@e2e-member');
  });

  test('adds and removes a friend', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('search People for {name} and add her as a friend', { params: { name: 'Priya Patel' } });
    await expect(screen.getByTestId('friend-toggle-priya-patel')).toHaveAccessibleName('Friends');

    await app.open('/people');
    await expect(screen.getByTestId('friends-list')).toContainText('Priya Patel');

    await agent.act("open Priya Patel's profile and unfriend her");
    await expect(screen.getByTestId('person-friend-toggle')).toHaveAccessibleName('Add friend');
  });

  test('pays privately with a note and emoji', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('prepare a payment to Marcus Reed for {amount} from the balance with the note {note}, pick the {emoji} emoji button below the note, choose Private visibility, and open the payment confirmation without confirming it', {
      params: { amount: '$2', note: 'E2E pizza', emoji: '🍕' },
    });
    await expect(screen.getByRole('button', { name: 'Emoji 🍕' })).toHaveAttribute('aria-pressed', 'true');
    await expect(screen.getByTestId('confirm-sheet')).toContainText('🍕 “E2E pizza”');
    await expect(screen.getByTestId('confirm-sheet')).toContainText('Private');
    await screen.getByRole('button', { name: 'Confirm payment' }).tap();
    await expect(screen.getByTestId('success-title')).toHaveText('You paid Marcus Reed');

    await agent.act('view the payment details');
    await expect(screen.getByTestId('transaction-detail')).toContainText('🍕 E2E pizza');
    await expect(screen.getByText('Private')).toBeVisible();
    await expect(screen.getByTestId('detail-amount')).toContainText('$2.00');
  });

  test('declines the incoming request', async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByTestId('requests-inbox')).toContainText('Movie snacks');
    await agent.act('decline the Movie snacks request from Marcus Reed');
    await expect(screen.getByTestId('request-status')).toHaveText('Declined');

    await app.open('/');
    // New members start with two requests; only Ava's dinner request is left.
    await expect(screen.getByTestId('requests-inbox')).toContainText('1 request for you');
    await expect(screen.getByTestId('requests-inbox')).toContainText('Dinner last week');
    await expect(screen.getByTestId('requests-inbox')).not.toContainText('Movie snacks');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');
  });

  test('creates a QR code that requests a set amount', async ({ app, agent, screen }) => {
    await app.open('/');
    await agent.act('open my QR code and create a Request a set amount code for {amount} with the note {note}', {
      params: { amount: '$7.50', note: 'E2E book club' },
    });
    await expect(screen.getByTestId('qr-request-card')).toContainText('$7.50');
    await expect(screen.getByTestId('qr-request-card')).toContainText('E2E book club');
    await expect(screen.getByTestId('qr-request-code')).toHaveText(/\S{6,}/);
  });
});
