import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  tests: ['tests/visual/**/*.e2e.ts'],
  output: '.e2e/visual',
  workers: 1,
  retries: 0,
  trace: 'off',
  targets: [{
    name: 'chromium',
    engine: web({ locale: 'en-US', timezoneId: 'UTC' }),
    app: {
      url: process.env.APP_URL ?? 'http://127.0.0.1:0',
      command: process.env.APP_URL ? undefined : {
        executable: 'npm',
        args: ['run', 'dev', '--', '-p', '{port}', '-H', '127.0.0.1'],
        startupTimeout: 120_000,
        log: '.e2e/logs/visual-app.log',
      },
    },
  }],
} satisfies E2EConfig;
