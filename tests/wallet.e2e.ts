import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { z } from 'zod';

describe('wallet', { session: 'member', tags: ['wallet'] }, () => {
  test('transfers part of the balance to a linked bank', async ({ app, agent, screen }) => {
    await app.open('/wallet/funding-sources');
    await agent.act('link a {institution} bank account with account number {accountNumber}', {
      params: { institution: 'Summit Federal', accountNumber: '9876543210' },
    });
    await agent.assert('Banks and cards lists a Summit Federal bank account ending in 3210');

    await app.open('/wallet/transfer');
    await agent.act('transfer {amount} from the balance to the linked bank with a Standard transfer', {
      params: { amount: '$6' },
    });
    await agent.assert('a success screen says Transfer on its way');

    await agent.act('view the transfer details');
    const transfer = await agent.extract('the transfer amount, Type, and Speed rows', {
      schema: z.object({ amount: z.string(), type: z.string(), speed: z.string() }),
    });
    expect(transfer).toMatchObject({ type: 'Transfer to bank', speed: 'Standard (1-3 days)' });
    expect(transfer.amount).toContain('$6.00');

    await app.open('/');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$4.00');
  });

  test('sends an instant transfer to a debit card and pays the fee', async ({ app, agent, screen }) => {
    await app.open('/wallet/funding-sources');
    await agent.act('link an {issuer} debit card with card number {cardNumber}', {
      params: { issuer: 'Atlas Card', cardNumber: '4111 1111 1111 4242' },
    });
    await agent.assert('Banks and cards lists an Atlas Card debit card ending in 4242');

    await app.open('/wallet/transfer');
    await agent.act('set up an Instant transfer of {amount} to the Atlas Card debit card without submitting it', {
      params: { amount: '$4' },
    });
    await agent.assert('the transfer is Instant and goes to the Atlas Card debit card');
    await expect(screen.getByTestId('transfer-submit')).toHaveText('Transfer $4.00');

    await agent.act('submit the transfer');
    await agent.assert('a success screen says Transfer sent instantly');

    // $4.00 plus the $0.25 minimum instant fee leaves $5.75.
    await agent.act('finish and return to the home dashboard');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$5.75');
  });

  test('changes the default funding source and removes the old one', async ({ app, agent }) => {
    await app.open('/wallet/funding-sources');
    await agent.act('link a Northwind Bank account with account number {accountNumber}', {
      params: { accountNumber: '11111111' },
    });
    await agent.assert('Banks and cards lists a Northwind Bank account ending in 1111');

    await agent.act('link a Meadow Savings account with account number {accountNumber}', {
      params: { accountNumber: '22222222' },
    });
    await agent.assert('Banks and cards lists a Meadow Savings account ending in 2222');

    await agent.act('make the Meadow Savings account the default');
    await agent.assert('the Meadow Savings account is marked as Default');

    await agent.act('remove the Northwind Bank account');
    await agent.assert('the Northwind Bank account is gone and the Meadow Savings account is still the Default');
  });
});
