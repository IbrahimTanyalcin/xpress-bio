const {defaults} = require('jest-config');
module.exports = {
    preset: void(0)/*"jest-puppeteer"*/,
    globals: {
		
    },
    testMatch: [
      "**/server/test/*.test.js"
      //"**/server/test/serverFastaBamIndex.test.js"
    ],
    verbose: true,
  setupFilesAfterEnv: ["./jest.setup.js"],
  collectCoverage: true,
  collectCoverageFrom: ["../../*.js"],
  coverageDirectory: "./coverage"
}