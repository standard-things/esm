import assert from "assert"
import execa from "execa"
import path from "path"
import require from "./require.js"

const isWin = process.platform === "win32"

const pkgPath = require.resolve("../")
const testPath = path.dirname(require.resolve("./tests.mjs"))

const NODE_BIN = path.resolve(testPath, "env/prefix", isWin ? "node.exe" : "bin/node")

describe("scenarios", function () {
  this.timeout(0)

  it("should work with @babel/register", () =>
    execa(NODE_BIN, ["./scenario/babel-register.js"], { cwd: testPath })
  )

  it("should work with ava, nyc, and tsc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc-tsc")
    const avaPath = path.resolve(dirPath, "test.js")
    const tscArgs = ["--project", dirPath]
    const nycArgs = ["--cwd", dirPath, "--require", pkgPath, "ava", avaPath]

    return Promise.resolve()
      .then(() => execa("tsc", tscArgs, { cwd: testPath }))
      .then(() => execa("nyc", nycArgs, { cwd: testPath }))
  })

  it("should work with jest", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/jest")
    const configPath = path.resolve(dirPath, "jest.config.json")
    const jestArgs = ["--config", configPath, "--rootDir", dirPath]

    return exec("jest", jestArgs)
  })
})
