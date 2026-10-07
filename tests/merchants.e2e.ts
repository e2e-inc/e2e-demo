import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test.describe('pay a business', { session: 'member', tags: ['merchants'] }, () => {
  test('pays a business in store from the balance', async ({ app, agent, screen }) => {
    await app.open('/profile');
    await agent.act('open Bloom Coffee Roasters and pay {amount} in store from the TesterPay balance', {
      params: { amount: '$4.50' },
    });
    await expect(screen.getByTestId('success-title')).toHaveText('You paid Bloom Coffee Roasters');

    await agent.act('view the payment details');
    await expect(screen.getByTestId('detail-amount')).toContainText('$4.50');
    await expect(screen.getByText('Business payment')).toBeVisible();
    await expect(screen.getByText('In store')).toBeVisible();

    await app.open('/');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$5.50');
  });

  test('covers an online order the balance cannot afford with a bank', async ({ app, agent, screen }) => {
    await app.open('/merchants');
    await agent.act('open Noodle Theory and switch to Online checkout');
    await expect(screen.getByTestId('merchant-cart')).toContainText('$24.00');
    await expect(screen.getByTestId('funding-picker')).toContainText('Not enough balance');

    await agent.act('check out the Noodle Theory online order, paying with a newly linked bank account numbered {accountNumber}', {
      params: { accountNumber: '000555554321' },
    });
    await expect(screen.getByTestId('success-title')).toHaveText('You paid Noodle Theory');

    await agent.act('view the payment details');
    await expect(screen.getByText('Online checkout')).toBeVisible();
    await expect(screen.getByText('Balance + Northwind Bank Checking ••4321')).toBeVisible();

    // The balance covers the first $10.00, the bank the remaining $14.00.
    await app.open('/');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$0.00');
  });

  test('pays a business by entering its store code', async ({ app, agent, screen, web }) => {
    await app.open('/');
    await agent.act('open Scan, enter the store code {code}, and continue', {
      params: { code: 'PPZ-M-TAQ' },
    });
    await expect(web).toHaveURL(/\/merchants\/m_taqueria$/);
    await expect(screen.getByTestId('merchant-hero')).toContainText('La Esquina Taqueria');

    await agent.act('pay {amount} in store from the TesterPay balance', { params: { amount: '$3' } });
    await expect(screen.getByTestId('success-title')).toHaveText('You paid La Esquina Taqueria');
  });

  test('rejects an unknown store code', async ({ app, agent, screen, web }) => {
    await app.open('/qr?tab=scan');
    await agent.act('enter the code {code} and continue, then stop once the app responds', {
      params: { code: 'PPZ-M-NOPE' },
    });
    await expect(screen.getByText("We don't recognize that code.")).toBeVisible();
    await expect(web).toHaveURL('/qr?tab=scan');
  });
});
