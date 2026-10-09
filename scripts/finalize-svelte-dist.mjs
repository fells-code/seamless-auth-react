import { copyFile, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Run from packages/svelte after svelte-package. It ships the shared stylesheet,
// then checks the output: the root entry must not reach SvelteKit, which is
// optional and needed only for ./kit, and since the browser model keeps tokens
// in the server adapter, no module may touch web storage directly or switch the
// transport to bearer mode.

const dist = path.join(process.cwd(), 'dist');

await copyFile(
  path.join(process.cwd(), '..', '..', 'resources', 'styles', 'seamless-auth.css'),
  path.join(dist, 'seamless-auth.css')
);

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return files(full);
      return /\.(js|svelte)$/.test(entry.name) ? [full] : [];
    })
  );
  return nested.flat();
}

async function imports(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);

  const source = await readFile(file, 'utf8');
  for (const [, specifier] of source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
    if (specifier.startsWith('.')) {
      const target = path.resolve(path.dirname(file), specifier);
      await imports(/\.(js|svelte)$/.test(target) ? target : `${target}.js`, seen);
    } else {
      seen.add(specifier);
    }
  }
  return seen;
}

const failures = [];

for (const file of await files(dist)) {
  const source = await readFile(file, 'utf8');
  const name = path.relative(dist, file);

  if (/localStorage|sessionStorage/.test(source)) {
    failures.push(`${name} reads or writes web storage directly`);
  }
  if (/mode:\s*["']bearer["']/.test(source)) {
    failures.push(`${name} configures bearer transport`);
  }
}

const reachable = [...(await imports(path.join(dist, 'index.js')))];
const kitImports = reachable.filter(
  spec => spec === '@sveltejs/kit' || spec.startsWith('$app/')
);
if (kitImports.length > 0) {
  failures.push(
    `index.js reaches ${kitImports.join(', ')}; SvelteKit belongs to ./kit only`
  );
}

for (const required of [
  'index.js',
  'index.d.ts',
  'kit/index.js',
  'kit/index.d.ts',
  'screens/Login.svelte',
  'seamless-auth.css',
]) {
  await stat(path.join(dist, required)).catch(() =>
    failures.push(`dist/${required} is missing`)
  );
}

if (failures.length > 0) {
  console.error(`finalize-svelte-dist failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(
  'finalize-svelte-dist: index.js is Kit-free; no web storage; cookie transport only'
);
