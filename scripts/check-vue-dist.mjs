import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Run from packages/vue after a build. The root entry must not reach
// vue-router, which is optional and needed only for ./router. The browser model
// keeps tokens in the server adapter, so no bundle may touch web storage
// directly or switch the transport to bearer mode.

const dist = path.join(process.cwd(), 'dist');

async function emittedModules(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return emittedModules(full);
      return entry.name.endsWith('.js') ? [full] : [];
    })
  );
  return nested.flat();
}

async function staticImports(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);

  const source = await readFile(file, 'utf8');
  for (const [, specifier] of source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
    if (specifier.startsWith('.')) {
      await staticImports(path.resolve(path.dirname(file), specifier), seen);
    } else {
      seen.add(specifier);
    }
  }
  return seen;
}

const failures = [];

for (const file of await emittedModules(dist)) {
  const source = await readFile(file, 'utf8');
  const name = path.relative(dist, file);

  if (/localStorage|sessionStorage/.test(source)) {
    failures.push(`${name} reads or writes web storage directly`);
  }
  if (/mode:\s*["']bearer["']/.test(source)) {
    failures.push(`${name} configures bearer transport`);
  }
}

if ((await staticImports(path.join(dist, 'index.js'))).has('vue-router')) {
  failures.push('index.js reaches vue-router; it belongs to the ./router entry only');
}

for (const required of [
  'index.js',
  'router.js',
  'index.d.ts',
  'router/index.d.ts',
  'seamless-auth.css',
]) {
  await stat(path.join(dist, required)).catch(() =>
    failures.push(`dist/${required} is missing`)
  );
}

if (failures.length > 0) {
  console.error(`check-vue-dist failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(
  'check-vue-dist: index.js is router-free; no web storage; cookie transport only'
);
