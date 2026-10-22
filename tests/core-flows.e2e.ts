import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('signs out and signs back in', { session: 'member', tags: ['smoke', 'auth'] }, async ({ app, agent, screen, browser }) => {
  const member = credentials.user('member');
  await app.open('/profile');
  await agent.act('sign out of the account');
  await expect(browser).toHaveURL('/welcome');

  await agent.act('sign in with the given account credentials', {
    params: { username: member.username, password: member.password },
  });
  await expect(browser).toHaveURL('/');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$10.00');
});

test('links a bank and adds money', { session: 'member', tags: ['smoke', 'wallet'] }, async ({ app, agent, screen, browser }) => {
  await app.open('/');
  await agent.act('open Add money and link a bank account using {accountNumber}', {
    params: { accountNumber: '000123456789' },
  });
  await expect(browser).toHaveURL('/wallet/add-money');
  await expect(screen.getByTestId('funding-picker')).toContainText('6789');

  await agent.act('add {amount} from the linked bank account', {
    params: { amount: '$20' },
  });
  await expect(screen.getByTestId('success-title')).toHaveText('Added $20.00');
  await agent.act('finish and return to the home dashboard');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$30.00');
});

test('pays a person and records the payment', { session: 'member', tags: ['smoke', 'payments'] }, async ({ app, agent, screen }) => {
  await app.open('/');
  await agent.act('pay Ava Chen {amount} from the TesterPay balance for {note}, and confirm the payment', {
    params: { amount: '$3', note: 'E2E coffee' },
  });
  await expect(screen.getByTestId('success-title')).toHaveText('You paid Ava Chen');

  await agent.act('view the payment details');
  await agent.assert('the payment details show the note E2E coffee');
  await app.open('/');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$7.00');
});

test('requests money and can cancel the request', { session: 'member', tags: ['smoke', 'requests'] }, async ({ app, agent, screen }) => {
  await app.open('/');
  await agent.act('request {amount} from Marcus Reed for {note}, and send the request', {
    params: { amount: '$4', note: 'E2E tickets' },
  });
  await expect(screen.getByTestId('success-title')).toHaveText('You requested $4.00');

  await app.open('/activity?tab=requests');
  await expect(screen.getByText('E2E tickets', { exact: false })).toBeVisible();
  await agent.act('open the E2E tickets request and cancel it');
  await expect(screen.getByTestId('request-status')).toHaveText('Cancelled');
});

test('pays a pending incoming request', { session: 'member', tags: ['requests'] }, async ({ app, agent, screen }) => {
  await app.open('/');
  await expect(screen.getByTestId('requests-inbox')).toBeVisible();
  await agent.act('open the Movie snacks request from Marcus Reed and pay its $6 from the TesterPay balance');
  await expect(screen.getByTestId('success-title')).toHaveText('You paid Marcus Reed');

  await agent.act('finish and return to the home dashboard');
  await expect(screen.getByTestId('balance-amount')).toHaveText('$4.00');
});

test('splits a bill into requests', { session: 'member', tags: ['smoke', 'split'] }, async ({ app, agent, screen }) => {
  await app.open('/');
  await agent.act('split a bill of {amount} for {note} evenly between yourself and Ava Chen, then send her request', {
    params: { amount: '$12', note: 'E2E lunch' },
  });
  await expect(screen.getByTestId('success-title')).toHaveText('Split $12.00 2 ways');
  await app.open('/activity?tab=requests');
  await expect(screen.getByText('E2E lunch', { exact: false })).toBeVisible();
});

test('verifies identity and creates a debit card', { session: 'member', tags: ['smoke', 'cards'] }, async ({ app, screen, browser }) => {
  await app.open('/cards');
  await screen.getByRole('button', { name: 'Get the debit card' }).tap();
  await expect(browser).toHaveURL('/settings/verify?next=debit');

  await screen.getByLabel('Date of birth (YYYY-MM-DD)').fill('1995-04-12');
  await screen.getByLabel('Last 4 of SSN').fill('1234');
  await screen.getByLabel('Street address').fill('1 Main Street');
  await screen.getByRole('button', { name: 'Verify' }).tap();
  await expect(screen.getByTestId('verify-success')).toContainText("You're verified");

  await screen.getByRole('button', { name: 'Continue to card' }).tap();
  await expect(browser).toHaveURL('/cards/new?type=debit');
  await screen.getByRole('checkbox', { name: 'Agree to cardholder terms' }).check();
  await screen.getByRole('button', { name: 'Create my card' }).tap();
  await expect(browser).toHaveURL(/\/cards\/[^/]+\?fresh=1$/);
  await expect(screen.getByTestId('card-fresh-banner')).toContainText('Your card is ready');

  await screen.getByRole('button', { name: 'Lock' }).tap();
  await expect(screen.getByTestId('card-lock-toggle')).toHaveAccessibleName('Unlock');
});
