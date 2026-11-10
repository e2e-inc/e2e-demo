import { describe, test } from '@e2e-dev/web';

describe('pay a business', { session: 'member', tags: ['merchants'] }, () => {
  test('pays a business in store from the balance', async ({ app, agent }) => {
    await app.open('/merchants');
    await agent.act('open Bloom Coffee Roasters');
    await agent.assert('the Bloom Coffee Roasters business page is shown');

    await agent.act('pay {amount} in store from the TesterPay balance', { params: { amount: '$4.50' } });
    await agent.assert('a success screen says You paid Bloom Coffee Roasters');

    await agent.act('view the payment details');
    await agent.assert('the details describe a $4.50 business payment made in store');

    await app.open('/');
    await agent.waitFor('the home dashboard shows a TesterPay balance of $5.50');
  });

  test('covers an online order the balance cannot afford with a bank', async ({ app, agent }) => {
    await app.open('/merchants');
    await agent.act('open Noodle Theory and switch to Online checkout');
    await agent.assert('the online order totals $24.00 and the app warns there is not enough balance');

    await agent.act('link a new bank account numbered {accountNumber} from the Pay with options', {
      params: { accountNumber: '000555554321' },
    });
    await agent.assert('the Noodle Theory business page is shown');

    await agent.act('check out the Noodle Theory online order, paying with the bank account ending in 4321');
    await agent.assert('a success screen says You paid Noodle Theory');

    await agent.act('view the payment details');
    await agent.assert('the details describe an online checkout funded by the balance plus a Northwind Bank Checking account ending in 4321');

    // The balance covers the first $10.00, the bank the remaining $14.00.
    await app.open('/');
    await agent.waitFor('the home dashboard shows a TesterPay balance of $0.00');
  });

  test('pays a business by entering its store code', async ({ app, agent }) => {
    await app.open('/qr?tab=scan');
    await agent.act('enter the store code {code} and continue', { params: { code: 'PPZ-M-TAQ' } });
    await agent.assert('the La Esquina Taqueria business page is shown');

    await agent.act('pay {amount} in store from the TesterPay balance', { params: { amount: '$3' } });
    await agent.assert('a success screen says You paid La Esquina Taqueria');
  });

  test('rejects an unknown store code', async ({ app, agent }) => {
    await app.open('/qr?tab=scan');
    await agent.act('enter the code {code} and continue, stopping once the app responds', {
      params: { code: 'PPZ-M-NOPE' },
    });
    await agent.assert('the app says it does not recognize the store code');
  });
});
