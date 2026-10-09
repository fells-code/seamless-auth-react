import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { copyFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The screens' stylesheet is shared with the other bindings and lives at the
// repository root. It is inlined as a string the layout injects, and shipped
// as a file for an application that would rather link it.
const stylesheet = path.resolve(__dirname, '../../resources/styles/seamless-auth.css');

const cssAsString = {
  name: 'css-as-string',
  transform(code, id) {
    if (!id.endsWith('.css')) return null;
    return { code: `export default ${JSON.stringify(code)};`, map: null };
  },
  writeBundle() {
    mkdirSync(path.resolve(__dirname, 'dist'), { recursive: true });
    copyFileSync(stylesheet, path.resolve(__dirname, 'dist/seamless-auth.css'));
  },
};

export default [
  {
    // Two entries in one build, so the injection key the plugin provides lives
    // in a single shared module both import. Separate builds would each carry
    // their own key, and the screens would never find the application's session.
    input: {
      index: 'src/index.ts',
      router: 'src/router/index.ts',
    },
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/shared-[hash].js',
    },
    external: ['vue', 'vue-router', '@seamless-auth/client'],
    plugins: [
      alias({
        entries: [
          { find: '@shared-styles/seamless-auth.css', replacement: stylesheet },
          { find: '@', replacement: path.resolve(__dirname, 'src') },
        ],
      }),
      cssAsString,
      typescript({ tsconfig: './tsconfig.build.json' }),
      terser(),
    ],
  },
];
