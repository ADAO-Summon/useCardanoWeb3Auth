import fs from "fs-extra"
import path from "path"
import typescript from "@rollup/plugin-typescript"
import peerDepsExternal from "rollup-plugin-peer-deps-external"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import polyfillNode from 'rollup-plugin-polyfill-node';
import wasm from 'rollup-plugin-wasm';
import packageJson from "./package.json" assert { type: "json" }
import json from "@rollup/plugin-json"
import ignore from "rollup-plugin-ignore"
import replace from '@rollup/plugin-replace'

const injectSelf = {
  name: 'inject-self',
  renderChunk(code) {
    return 'var self = typeof self !== "undefined" ? self : this;\n' + code;
  }
};

const injectGlobal = {
  name: 'inject-global',
  renderChunk(code) {
    return 'var global = typeof self !== undefined ? self : this;\n' + code;
  }
};

// rollup.config.js
/**
 * @type {import('rollup').RollupOptions}
 */
export default {
  input: "src/index.ts",
  output: [
    {
     // file: packageJson.module,
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name]-[hash][extname]",
      dir: 'dist', // Use `dir` instead of `file` for multiple chunks
    },
  ],
  plugins: [
    peerDepsExternal(),
    replace({
     // 'typeof window': JSON.stringify('object'),
      //'window.crypto': 'self.crypto',
      'global': 'self',
      preventAssignment: true,
    }),
    resolve({
      extensions: ['.js', '.ts', '.wasm'],
    }),
  //  injectSelf,
    //injectGlobal,
    json(),
    commonjs(),
    ignore(['fetch']), 
    polyfillNode(),
    typescript({
      noEmit: true,
      exclude: ["node_modules/**", "dist/**"],
    }),
    wasm()
  ],
  external: ["react", "react-dom", '@toruslabs/broadcast-channel', 'lucid-cardano', '@toruslabs/tss-client']
}