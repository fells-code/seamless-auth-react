import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";

export default [
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      entryFileNames: "[name].[format].js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      peerDepsExternal(),
      resolve({ extensions: [".ts", ".tsx"] }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
      }),
      postcss({
        modules: {
          generateScopedName: "[name]__[local]___[hash:base64:5]",
        },
        extract: false,
        inject: true,
        minimize: true,
      }),
      babel({
        babelHelpers: "bundled",
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        presets: ["@babel/preset-env", "@babel/preset-react"],
        exclude: "node_modules/**",
      }),
      terser(),
    ],
  },
];
