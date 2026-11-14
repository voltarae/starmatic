// Goal Galaxy's tests open the real page in a real browser, at phone size.
// The page is served from the repo root by a tiny local server (offline mode needs http, not file://).
const { defineConfig } = require("@playwright/test");
const PORT = 4173;
module.exports = defineConfig({
  testDir: ".",
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    viewport: { width: 390, height: 844 },
    channel: process.env.PW_CHANNEL || undefined,     // PW_CHANNEL=chrome uses an installed Chrome
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
