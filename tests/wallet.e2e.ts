import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('wallet', { session: 'member', tags: ['wallet'] }, () => {
  test('transfers part of the balance to a linked bank', async ({ app, agent, screen, browser }) => {
    await app.open('/profile');
    await agent.act('open Banks and cards and link a {institution} bank account with account number {accountNumber}', {
      params: { institution: 'Summit Federal', accountNumber: '9876543210' },
    });
    await expect(browser).toHaveURL('/wallet/funding-sources');
    await expect(screen.getByTestId('funding-row-3210')).toContainText('Summit Federal');

    await app.open('/');
    await agent.act('transfer {amount} from the balance to the linked bank with a Standard transfer', {
      params: { amount: '$6' },
    });
    await expect(screen.getByTestId('success-title')).toHaveText('Transfer on its way');

    await agent.act('view the transfer details');
    await expect(screen.getByTestId('transaction-detail')).toBeVisible();
    await agent.assert('the details describe a transfer to a bank using the Standard speed of 1-3 days');

    await app.open('/');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$4.00');
  });

  test('sends an instant transfer to a debit card and pays the fee', async ({ app, agent, screen }) => {
    await app.open('/wallet/funding-sources');
    await agent.act('link an {issuer} debit card with card number {cardNumber}', {
      params: { issuer: 'Atlas Card', cardNumber: '4111 1111 1111 4242' },
    });
    await expect(screen.getByTestId('funding-row-4242')).toContainText('Debit card');

    await app.open('/wallet/transfer');
    await screen.getByRole('button', { name: 'Instant transfer' }).tap();
    await screen.getByTestId('funding-picker').tap();
    await screen.getByTestId('funding-option-4242').tap();
    await expect(screen.getByTestId('funding-picker')).toContainText('Atlas Card');
    await screen.getByTestId('key-4').tap();
    await expect(screen.getByTestId('amount-display')).toHaveText('4');
    await expect(screen.getByTestId('transfer-submit')).toHaveText('Transfer $4.00');
    await expect(screen.getByTestId('transfer-submit')).toBeEnabled();
    await screen.getByTestId('transfer-submit').tap();
    await expect(screen.getByTestId('success-title')).toHaveText('Transfer sent instantly');

    // $4.00 plus the $0.25 minimum instant fee leaves $5.75.
    await agent.act('finish and return to the home dashboard');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$5.75');
  });

  test('changes the default funding source and removes the old one', async ({ app, agent, screen }) => {
    await app.open('/wallet/funding-sources');
    await agent.act('link a Northwind Bank account with account number {first}, then link a Meadow Savings account with account number {second}', {
      params: { first: '11111111', second: '22222222' },
    });
    await expect(screen.getByTestId('funding-row-1111')).toBeVisible();
    await expect(screen.getByTestId('funding-row-2222')).toBeVisible();

    await agent.act('make the Meadow Savings account the default');
    await expect(screen.getByTestId('funding-row-2222')).toContainText('Default');

    await agent.act('remove the Northwind Bank account');
    await expect(screen.getByTestId('funding-row-1111')).toHaveCount(0);
    await expect(screen.getByTestId('funding-row-2222')).toContainText('Default');
  });
});
