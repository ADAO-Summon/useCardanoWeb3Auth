  import { defineConfig } from "cypress";
  import webpackPreprocessor from "@cypress/webpack-preprocessor";
  import { NormalModuleReplacementPlugin } from "webpack";
  import path from "path";

  export default defineConfig({
    fileServerFolder: "public",
    chromeWebSecurity: false,
    component: {
      chromeWebSecurity: false,
      defaultCommandTimeout: 60000,
      fileServerFolder: "assets",
      setupNodeEvents(on, config) {
        // Import the necessary plugins within this function
        on("file:preprocessor", async (file) => {
          const webpackOptions = await import("./webpack.config.cjs");
          const options: any = {
            webpackOptions: webpackOptions.default,
            watchOptions: {},
          };
          return webpackPreprocessor(options)(file);
        });
        // For example, setting up a webpack preprocessor:
        /* const options: any = {
          // Specify webpack options here
          webpackOptions: ,
          watchOptions: {},
        };
        on("file:preprocessor", webpackPreprocessor(options)); */
        // Return the updated config object
        return config;
      },
      devServer: {
        framework: "react",
        bundler: "webpack",
      },
    },

  });
