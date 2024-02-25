import fs from "fs-extra";
import path from "path";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

import packageJson from "./package.json" assert { type: "json" };

// rollup.config.js
export default {
  input: "src/index.ts",
  output: [
    {
      file: packageJson.module,
      format: "esm",
      sourcemap: true,
      assetFileNames: "[name]-[hash][extname]",
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true, // Important for Next.js compatibility
    }),
    commonjs({
      // Explore options for handling named exports or compatibility
      // Example: namedExports: { '@web3auth/mpc-core-kit': ['COREKIT_STATUS'] }
    }),
    typescript({
      noEmit: true,
      exclude: ["node_modules/**", "dist/**"],
    }),
  ],
  external: ["react", "react-dom", "@web3auth/mpc-core-kit"], // Add the peer dependency as external
};
