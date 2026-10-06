import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import path from 'path';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    // Two entries in one build, so the provider's context lives in a single
    // shared module that both import. Separate builds would each inline their own
    // copy, and the bundled screens would never see the application's provider.
    input: {
      index: 'src/index.ts',
      routes: 'src/routes.ts',
    },
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/shared-[hash].js',
    },
    external: [
      'react',
      'react-dom',
      'react-router-dom',
      '@seamless-auth/client',
      '@simplewebauthn/browser',
      'libphonenumber-js',
    ],
    plugins: [
      peerDepsExternal(),
      alias({
        entries: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
      }),
      postcss({
        modules: {
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
        extract: false,
        inject: true,
        minimize: true,
      }),

      // Every module here holds browser state or effects, so the whole package is
      // a client boundary; server code reads from @seamless-auth/client instead.
      // Rollup strips module-level directives while bundling, and terser drops an
      // output banner as a dead expression, so the directive goes in as terser's
      // preamble. scripts/check-react-dist.mjs fails the build if it goes missing.
      terser({ format: { preamble: "'use client';" } }),
    ],
  },
];
