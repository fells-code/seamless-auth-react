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
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: true,
    },
    external: [
      'react',
      'react-dom',
      'react-router-dom',

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
        tsconfig: './tsconfig.json',
      }),
      postcss({
        modules: {
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
        extract: false,
        inject: true,
        minimize: true,
      }),

      terser(),
    ],
  },
];
