import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Run from packages/angular after ng-packagr. It finishes the manifest that
// Changesets publishes from dist, then checks the bundles. The browser model keeps tokens in
// the server adapter, so the published bundle must never touch web storage
// for anything but the two non-secret keys the client core writes, and must
// never switch the transport to bearer mode.

const dist = path.join(process.cwd(), 'dist');

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return files(full);
      return entry.name.endsWith('.mjs') ? [full] : [];
    })
  );
  return nested.flat();
}

const failures = [];
const bundles = await files(path.join(dist, 'fesm2022'));

if (bundles.length < 2) {
  failures.push('expected the root and routes bundles in dist/fesm2022');
}

for (const file of bundles) {
  const source = await readFile(file, 'utf8');
  const name = path.relative(dist, file);

  if (/localStorage|sessionStorage/.test(source)) {
    failures.push(`${name} reads or writes web storage directly`);
  }
  if (/mode:\s*['"]bearer['"]/.test(source)) {
    failures.push(`${name} configures bearer transport`);
  }
  if (/ɵɵdefineComponent|ɵɵdefineInjectable\(/.test(source)) {
    failures.push(`${name} is fully compiled; libraries must ship partial declarations`);
  }
}

const manifestPath = path.join(dist, 'package.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

// `directory` tells Changesets to publish from dist. Inside dist it means
// nothing, and npm would warn about it.
delete manifest.publishConfig?.directory;
manifest.exports = { ...manifest.exports, './seamless-auth.css': './seamless-auth.css' };
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

for (const entry of ['.', './routes', './seamless-auth.css']) {
  if (!manifest.exports?.[entry]) {
    failures.push(`dist/package.json has no export for ${entry}`);
  }
}

if (failures.length > 0) {
  console.error(`finalize-angular-dist failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(
  `finalize-angular-dist: ${bundles.length} partial-compiled bundles, no web storage, cookie transport only`
);
