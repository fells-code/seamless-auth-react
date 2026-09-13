import { rm } from 'node:fs/promises';
import path from 'node:path';

// Run from a package directory: clears that package's dist before a build.
await rm(path.join(process.cwd(), 'dist'), { force: true, recursive: true });
