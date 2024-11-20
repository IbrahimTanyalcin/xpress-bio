const {defaults} = require('jest-config');
module.exports = {
    preset: void(0)/*"jest-puppeteer"*/,
    globals: {
		
    },
    testMatch: [
      ////"**/server/test/*.test.js"
      //"**/server/test/serverFastaBamIndex.test.js"
      //"**/server/test/app.bin.downloadX.sh.test.js"
      //"**/server/test/serverAtomic.test.js"
      //"**/server/test/strMatchList.test.js"
      //"**/server/test/serverDwnld.test.js"
      //"**/server/test/uriWhiteList.test.js"
      //"**/server/test/uriBlackList.test.js"
      //"**/server/test/helpers.clamp.test.js"
      //"**/server/test/helpers.tryKeys.test.js"
      //"**/server/test/serverBlastn.test.js"
      //"**/server/test/serverStress.test.js"
      //"**/server/test/validateWs.test.js"
      //"**/server/test/weakBucket.test.js"
      "**/server/test/rateLimiter.test.js"
    ],
    verbose: true,
  setupFilesAfterEnv: ["./jest.setup.js"],
  collectCoverage: true,
  collectCoverageFrom: ["../../*.js"],
  coverageDirectory: "./coverage"
}