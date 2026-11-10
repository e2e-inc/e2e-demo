// Bug-bash config for TesterPay. Copy to the repo root (gitignored) and run `npm run build` first:
//   cp .agents/skills/verify-testerpay-next/e2e.bugbash.config.ts . && npm run build
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';
import base from './e2e.config';

const context = [
  base.agents.default.context,
  'Everything runs in the browser: the backend is an in-page SQLite database in IndexedDB, so no request leaves the page and nothing is sent by email or SMS.',
  'Seed data is not a bug: the demo people (Ava Chen, Marcus Reed, Priya Patel, Leo Alvarez), the eight businesses and their PPZ-M-* store codes, the two pending requests a new member starts with (Movie snacks $6 from Marcus, Dinner last week from Ava), and the $10.00 starting balance.',
  'Bank links, card numbers, identity checks, and card approvals are simulated and accept any well-formed input.',
  'Instant transfers cost 1.75% with a $0.25 minimum and $25 maximum; standard transfers are free. A single payment is capped at $5,000.',
  'Never press Reset demo in Settings unless the charter asks for it: it wipes the account and ends the run signed out.',
].join(' ');

export default {
  ...base,
  tests: [...base.tests, 'tests/bugbash/**/*.e2e.ts'],
  // A production build served by `next start`; port 0 gives every explorer its own server.
  // The server holds no state (data lives in each browser context), so explorers never share accounts.
  targets: [{
    engine: web(),
    app: {
      url: 'http://127.0.0.1:0',
      command: {
        executable: 'npx',
        args: ['next', 'start', '-p', '{port}', '-H', '127.0.0.1'],
        startupTimeout: 60_000,
        log: '.e2e/logs/bugbash-app.log',
      },
    },
  }],
  retries: 0,
  workers: 1,
  reporters: ['list'],
  agents: {
    default: {
      model: gateway('openai/gpt-6-luna-fast'),
      maxSteps: 40,
      maxModelCalls: 40,
      context,
      system: 'You are a QA tester. Use the visible UI like a real member would, check every amount, balance, and label against the rest of the app, and report a finding the moment you have evidence.',
    },
    skeptic: {
      model: gateway('openai/gpt-6-luna-fast'),
      maxSteps: 40,
      maxModelCalls: 40,
      context,
      system: 'You are a skeptical QA tester. After every action, go back, reload, and revisit related screens (home balance, Activity, the person or card page) to check the change stuck everywhere it should. Report state that is lost, stale, duplicated, or inconsistent between screens.',
    },
    fuzzer: {
      model: gateway('openai/gpt-6-luna-fast'),
      maxSteps: 40,
      maxModelCalls: 40,
      context,
      system: 'You are an edge-case QA tester. Feed each field empty, zero, negative, oversized, too many decimals, unicode and emoji, and leading or trailing spaces. Report input that is accepted when it should not be, rejected without a clear message, or silently changed.',
    },
  },
} satisfies E2EConfig;
