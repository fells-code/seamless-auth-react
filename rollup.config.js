import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import { terser } from "rollup-plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    nodeResolve({
      extensions: [".ts", ".tsx"],
    }),
    typescript(),
    babel({
      babelHelpers: "bundled",
      extensions: [".ts", ".tsx"],
    }),
    postcss({
      extensions: [".css"],
      inject: true,
      minimize: true,
      plugins: [
        require("postcss-import"),
        require("tailwindcss"),
        require("autoprefixer"),
      ],
    }),
    terser(),
  ],
  external: ["react", "react-dom"],
};
