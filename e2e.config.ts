import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';

export default {
  // The Vercel AI Gateway serves the model id and reads AI_GATEWAY_API_KEY, or the OIDC token of a linked Vercel project.
  agents: {
    default: {
      model: gateway('anthropic/claude-haiku-5.5'),
      context: 'TesterPay is a local demo payment app. New members start with a $10 TesterPay balance. Payments, requests, bank links, identity checks, and cards are simulated. Ava Chen and Marcus Reed are searchable demo people.',
      system: 'Use the visible UI to complete the stated goal. Read confirmation screens before submitting, and stop when the requested outcome is visible.',
    },
  },
  targets: [{
    engine: web({
      url: process.env.APP_URL ?? 'http://127.0.0.1:0',
      command: process.env.APP_URL ? undefined : {
        executable: 'npm',
        args: ['run', 'dev', '--', '-p', '{port}', '-H', '127.0.0.1'],
        startupTimeout: 120_000,
        log: '.e2e/logs/app.log',
      },
    }),
  }],
  credentials: {
    member: {
      username: 'e2e.member@example.test',
      password: process.env.E2E_MEMBER_PASSWORD ?? 'DemoPass123!',
    },
    newcomer: {
      username: 'e2e.newcomer@example.test',
      password: process.env.E2E_NEWCOMER_PASSWORD ?? 'NewcomerPass456!',
    },
  },
} satisfies E2EConfig;
