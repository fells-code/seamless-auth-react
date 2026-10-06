import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Run from packages/react after a build. Both properties fail at the consumer
// rather than here if they regress: a missing directive breaks a Next.js server
// component import, and a router import in the main entry makes react-router-dom
// mandatory again for applications that never render the bundled screens.

const dist = path.join(process.cwd(), 'dist');
const DIRECTIVE = /^['"]use client['"];/;

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
  if (!DIRECTIVE.test(source)) {
    failures.push(`${path.relative(dist, file)} does not start with 'use client'`);
  }
}

const reachableFromIndex = await staticImports(path.join(dist, 'index.js'));
if (reachableFromIndex.has('react-router-dom')) {
  failures.push(
    'index.js reaches react-router-dom; it belongs to the ./routes entry only'
  );
}

if (failures.length > 0) {
  console.error(`check-react-dist failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(
  'check-react-dist: every module is a client boundary; index.js is router-free'
);
