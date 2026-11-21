const { defineConfig } = require('cypress');
const fs = require('fs');

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
         * Creates the lock directory of a store to simulate an external writer lock.
         * @param {string} lockPath - relative or absolute path to the store lock directory (<storageDirectory>/<storeName>.lock)
         */
        lockStore(lockPath) {
          fs.mkdirSync(lockPath, { recursive: true });
          return null;
        },

        /**
         * Removes the lock directory of a store to release a simulated lock.
         * @param {string} lockPath - relative or absolute path to the store lock directory
         */
        unlockStore(lockPath) {
          if (fs.existsSync(lockPath)) {
            fs.rmSync(lockPath, { recursive: true, force: true });
          }
          return null;
        },
      });
    },
  },
});
