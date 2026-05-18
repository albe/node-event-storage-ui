const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    screenshotsFolder: 'public/screenshots/generated',
    viewportWidth: 1440,
    viewportHeight: 1200,
    video: false,
    setupNodeEvents(on) {
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron' && browser.isHeadless) {
          launchOptions.args.push('--window-size=1440,1200');
        }

        if (browser.name === 'electron') {
          launchOptions.preferences.width = 1440;
          launchOptions.preferences.height = 1200;
        }

        return launchOptions;
      });

      on('task', {
        /**
         * Creates a .lock directory inside the store path to simulate an external writer lock.
         * @param {string} storePath - relative or absolute path to the event store directory
         */
        lockStore(storePath) {
          const lockPath = path.join(storePath, '.lock');
          fs.mkdirSync(lockPath, { recursive: true });
          return null;
        },

        /**
         * Removes the .lock directory from the store path to release a simulated lock.
         * @param {string} storePath - relative or absolute path to the event store directory
         */
        unlockStore(storePath) {
          const lockPath = path.join(storePath, '.lock');
          if (fs.existsSync(lockPath)) {
            fs.rmSync(lockPath, { recursive: true, force: true });
          }
          return null;
        },
      });
    },
  },
});
