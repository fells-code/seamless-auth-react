import { spawnSync } from 'node:child_process';

// `npm test` runs every package's tests. Most run as Jest projects; the Svelte
// binding needs the Svelte compiler and runs under Vitest. Arguments after
// `npm test --` go to Jest, as they always have, and --coverage is passed on
// to Vitest so CI collects both.

const args = process.argv.slice(2);
const run = (command, commandArgs) =>
  spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }).status ?? 1;

const jest = run('npx', ['jest', ...args]);
const vitest = run('npm', [
  'run',
  'test',
  '-w',
  '@seamless-auth/svelte',
  ...(args.includes('--coverage') ? ['--', '--coverage.enabled'] : []),
]);

process.exit(jest || vitest);
