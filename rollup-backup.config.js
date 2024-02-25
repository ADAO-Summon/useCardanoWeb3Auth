import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import replace from '@rollup/plugin-replace';
import url from '@rollup/plugin-url';
import copy from 'rollup-plugin-copy';
import polyfillNode from 'rollup-plugin-polyfill-node';
export default {
  input: 'src/index.ts', // Adjust this if your entry file is different
  output: [
    {
      dir: 'dist', // Use `dir` instead of `file` for multiple chunks
      format: 'esm',
    },
    // Additional output formats as needed
  ],
  external: ['react', 'react-dom', '@toruslabs/broadcast-channel'], // Mark React and other external libraries
  plugins: [
    url({
        include: ['**/*.wasm'], // Patterns to include
        limit: 0, // Disable inlining files
        emitFiles: true, // Emit files to output dir
        fileName: '[name][extname]', // Keep original filename and extension
      }),
    copy({
    targets: [
        { src: './node_modules/lucid-cardano/esm/src/core/libs/cardano_message_signing/cardano_message_signing_bg.wasm', dest: 'dist' },
        { src: './node_modules/lucid-cardano/esm/src/core/libs/cardano_multiplatform_lib/cardano_multiplatform_lib_bg.wasm', dest: 'dist' }

    ]
    }),
    json(),
    resolve({
        preferBuiltins: true, // Suppress warnings about preferring built-ins
        browser: true
    }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }), // Use your tsconfig file
    polyfillNode(),
    babel({
      extensions: ['.js', '.jsx', '.ts', '.tsx'], // Add TypeScript extensions
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env', '@babel/preset-react']
    }),
  ],
};
