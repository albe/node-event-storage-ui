const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    screenshotsFolder: 'public/screenshots',
    video: false,
    setupNodeEvents(on) {
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
