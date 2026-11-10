import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { z } from 'zod';

const paymentDetails = z.object({
  amount: z.string(),
  type: z.string(),
  channel: z.string(),
  funding: z.string(),
});

describe('pay a business', { session: 'member', tags: ['merchants'] }, () => {
  test('pays a business in store from the balance', async ({ app, agent, screen }) => {
    await app.open('/merchants');
    await agent.act('open Bloom Coffee Roasters');
    await agent.assert('the Bloom Coffee Roasters business page is shown');

    await agent.act('pay {amount} in store from the TesterPay balance', { params: { amount: '$4.50' } });
    await agent.assert('a success screen says You paid Bloom Coffee Roasters');

    await agent.act('view the payment details');
    const details = await agent.extract('the payment amount, the Type, Channel, and Funding rows', { schema: paymentDetails });
    expect(details).toMatchObject({ type: 'Business payment', channel: 'In store', funding: 'TesterPay balance' });
    expect(details.amount).toContain('$4.50');

    await app.open('/');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$5.50');
  });

  test('covers an online order the balance cannot afford with a bank', async ({ app, agent, screen }) => {
    await app.open('/merchants');
    await agent.act('open Noodle Theory and switch to Online checkout');
    await expect(screen.getByTestId('merchant-pay-submit')).toHaveText('Pay $24.00 · Checkout');
    await agent.assert('the app warns there is not enough balance for the order');

    await agent.act('link a new bank account numbered {accountNumber} from the Pay with options', {
      params: { accountNumber: '000555554321' },
    });
    await agent.assert('the Noodle Theory business page is shown');

    await agent.act('check out the Noodle Theory online order, paying with the bank account ending in 4321');
    await agent.assert('a success screen says You paid Noodle Theory');

    await agent.act('view the payment details');
    const details = await agent.extract('the payment amount, the Type, Channel, and Funding rows', { schema: paymentDetails });
    expect(details).toMatchObject({ channel: 'Online checkout', funding: 'Balance + Northwind Bank Checking ••4321' });
    expect(details.amount).toContain('$24.00');

    // The balance covers the first $10.00, the bank the remaining $14.00.
    await app.open('/');
    await expect(screen.getByTestId('balance-amount')).toHaveText('$0.00');
  });

  test('pays a business by entering its store code', async ({ app, agent }) => {
    await app.open('/qr?tab=scan');
    await agent.act('enter the store code {code} and continue', { params: { code: 'PPZ-M-TAQ' } });
    await agent.assert('the La Esquina Taqueria business page is shown');

    await agent.act('pay {amount} in store from the TesterPay balance', { params: { amount: '$3' } });
    await agent.assert('a success screen says You paid La Esquina Taqueria');
  });

  test('rejects an unknown store code', async ({ app, agent, browser }) => {
    await app.open('/qr?tab=scan');
    await agent.act('enter the code {code} and continue, stopping once the app responds', {
      params: { code: 'PPZ-M-NOPE' },
    });
    await agent.assert('the app says it does not recognize the store code');
    // A rejected code must not open any business page.
    await expect(browser).toHaveURL('/qr?tab=scan');
  });
});
