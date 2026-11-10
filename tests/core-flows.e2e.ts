import { test } from '@e2e-dev/web';
import { credentials } from 'e2e';

test('signs out and signs back in', { session: 'member', tags: ['smoke', 'auth'] }, async ({ app, agent }) => {
  const member = credentials.user('member');
  await app.open('/profile');
  await agent.act('sign out of the account');
  await agent.assert('the welcome screen is shown');

  await agent.act('sign in with the given account credentials', {
    params: { username: member.username, password: member.password },
  });
  await agent.assert('the home dashboard shows a TesterPay balance of $10.00');
});

test('links a bank and adds money', { session: 'member', tags: ['smoke', 'wallet'] }, async ({ app, agent }) => {
  await app.open('/wallet/add-money');
  await agent.act('link a bank account with account number {accountNumber}', {
    params: { accountNumber: '000123456789' },
  });
  await agent.assert('the Add money screen pays from a bank account ending in 6789');

  await agent.act('add {amount} from the linked bank account', { params: { amount: '$20' } });
  await agent.assert('a success screen says Added $20.00');

  await agent.act('finish and return to the home dashboard');
  await agent.assert('the home dashboard shows a TesterPay balance of $30.00');
});

test('pays a person and records the payment', { session: 'member', tags: ['smoke', 'payments'] }, async ({ app, agent }) => {
  await app.open('/');
  await agent.act('pay Ava Chen {amount} from the TesterPay balance with the note {note}', {
    params: { amount: '$3', note: 'E2E coffee' },
  });
  await agent.assert('a success screen says You paid Ava Chen');

  await agent.act('view the payment details');
  await agent.assert('the payment details show $3.00 to Ava Chen with the note E2E coffee');

  await app.open('/');
  await agent.waitFor('the home dashboard shows a TesterPay balance of $7.00');
});

test('requests money and can cancel the request', { session: 'member', tags: ['smoke', 'requests'] }, async ({ app, agent }) => {
  await app.open('/');
  await agent.act('request {amount} from Marcus Reed with the note {note}', {
    params: { amount: '$4', note: 'E2E tickets' },
  });
  await agent.assert('a success screen says You requested $4.00');

  await app.open('/activity?tab=requests');
  await agent.act('open the E2E tickets request');
  await agent.assert('the request details show $4.00 requested from Marcus Reed for E2E tickets');

  await agent.act('cancel the request');
  await agent.assert('the request status is Cancelled');
});

test('pays a pending incoming request', { session: 'member', tags: ['requests'] }, async ({ app, agent }) => {
  await app.open('/');
  await agent.act('open the Movie snacks request from Marcus Reed');
  await agent.assert('the request details show Marcus Reed asking for $6.00 for Movie snacks');

  await agent.act('pay the request from the TesterPay balance');
  await agent.assert('a success screen says You paid Marcus Reed');

  await agent.act('finish and return to the home dashboard');
  await agent.assert('the home dashboard shows a TesterPay balance of $4.00');
});

test('splits a bill into requests', { session: 'member', tags: ['smoke', 'split'] }, async ({ app, agent }) => {
  await app.open('/split/new');
  await agent.act('split a bill of {amount} for {note} evenly between yourself and Ava Chen, and send her request', {
    params: { amount: '$12', note: 'E2E lunch' },
  });
  await agent.assert('a success screen says the $12.00 bill was split 2 ways');

  await app.open('/activity?tab=requests');
  await agent.waitFor('the requests list includes a $6.00 request to Ava Chen for E2E lunch');
});

test('verifies identity and creates a debit card', { session: 'member', tags: ['smoke', 'cards'] }, async ({ app, agent }) => {
  await app.open('/cards');
  await agent.act('start getting the debit card, stopping on the Verify identity screen');
  await agent.assert('the Verify identity screen is shown');

  await agent.act("verify identity with the given details, stopping on the You're verified screen", {
    params: { dateOfBirth: '1995-04-12', ssnLast4: '1234', streetAddress: '1 Main Street' },
  });
  await agent.assert("the screen says You're verified");

  await agent.act('continue to the card, agree to the cardholder terms, and create the card');
  await agent.assert('the screen says the debit card is ready');

  await agent.act('lock the card');
  await agent.assert('the card is locked and offers to unlock it');
});
