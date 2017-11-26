import assert from "assert"
import execa from "execa"
import path from "path"
import require from "./require.js"

const pkgPath = require.resolve("../")
const testPath = path.dirname(require.resolve("./tests.mjs"))

function exec(filePath, args) {
  return execa(filePath, args, {
    cwd: testPath
  })
}

describe("scenarios", function () {
  this.timeout(0)

  it("should work with @babel/register", () =>
    exec(process.execPath, ["./scenario/babel-register.js"])
  )

  it("should work with ava, nyc, and tsc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc-tsc")
    const avaPattern = path.resolve(dirPath, "test.js")
    const tscArgs = ["--project", dirPath]
    const nycArgs = ["--cwd", dirPath, "--require", pkgPath, "ava", avaPattern]

    return Promise.resolve()
      .then(() => exec("tsc", tscArgs))
      .then(() => exec("nyc", nycArgs))
  })

  it("should work with jest", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/jest")
    const configPath = path.resolve(dirPath, "jest.config.json")
    const jestArgs = ["--config", configPath, "--rootDir", dirPath]

    return exec("jest", jestArgs)
  })
})
