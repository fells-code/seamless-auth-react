import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";

export default [
  // === Main JS Build ===
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      entryFileNames: "[name].[format].js",
      format: "esm", // or dynamically set in a loop if needed
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

  // === Type Declarations ===
  {
    input: "dist/types/index.d.ts",
    output: [{ file: "dist/index.d.ts", format: "esm" }],
    plugins: [dts()],
  },
];
