const {defaults} = require('jest-config');
module.exports = {
    preset: void(0)/*"jest-puppeteer"*/,
    globals: {
		
    },
    testMatch: [
      "**/server/test/*.test.js"
      //done//"**/server/test/serverFastaBamIndex.test.js"
      //done//"**/server/test/app.bin.downloadX.sh.test.js"
      //done//"**/server/test/serverAtomic.test.js"
      //done//"**/server/test/strMatchList.test.js"
      //done//"**/server/test/serverDwnld.test.js"
      //done//"**/server/test/uriWhiteList.test.js"
      //done//"**/server/test/uriBlackList.test.js"
      //done//"**/server/test/helpers.clamp.test.js"
      //done//"**/server/test/helpers.tryKeys.test.js"
      //done//"**/server/test/serverBlastn.test.js"
      //done//"**/server/test/serverStress.test.js"
      //done//"**/server/test/validateWs.test.js",
      //done//"**/server/test/weakBucket.test.js",
      //done//"**/server/test/rateLimiter.test.js",
      //done//"**/server/test/penalizer.test.js",
      //done//"**/server/test/wsSend8.test.js"
      //done//"**/server/test/helpers.getUuidFromCookie.test.js",
      //done//"**/server/test/captureSpawn.test.js"
    ],
    verbose: true,
  setupFilesAfterEnv: ["./jest.setup.js"],
  collectCoverage: true,
  collectCoverageFrom: ["../../*.js"],
  coverageDirectory: "./coverage"
}