import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from "path";
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import inject from '@rollup/plugin-inject';
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  plugins: [react(), topLevelAwait(), wasm(),
    /* NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }), */
   // nodePolyfills()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'node-fetch': 'node-fetch-polyfill',
      buffer: 'buffer/',
      'stream': 'stream-browserify'
    },
  },
  optimizeDeps: {
    include: ['stream-browserify'],
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis'
    },
    // Enable esbuild polyfill plugins
    plugins: [
        NodeGlobalsPolyfillPlugin({
            buffer: true,
        }),
    ]
    },
    exclude: ['lucid-cardano'],
  },
  build: {
    target: 'es2020',

  },
  define: {
    'process.env': process.env,
    global: {},
  },

});
