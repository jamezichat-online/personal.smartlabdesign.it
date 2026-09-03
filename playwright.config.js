// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'file://' + __dirname,
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium',
    },
  },
});
