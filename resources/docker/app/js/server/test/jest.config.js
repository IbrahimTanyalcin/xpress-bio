const {defaults} = require('jest-config');
module.exports = {
    preset: void(0)/*"jest-puppeteer"*/,
    globals: {
		
    },
    testMatch: [
      "**/server/test/serverDwnld.test.js"
    ],
    verbose: true,
  setupFilesAfterEnv: ["./jest.setup.js"],
  collectCoverage: true,
  collectCoverageFrom: ["../../*.js"],
  coverageDirectory: "./coverage"
}