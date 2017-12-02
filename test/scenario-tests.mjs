import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"
import trash from "../script/trash.js"

const canTestPM2 = ! ("TRAVIS" in process.env)

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

  ;(canTestPM2 ? it : xit)(
  "should work with pm2", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register")
    const indexPath = path.resolve(dirPath, "index.js")
    const logsPath = path.resolve(testPath, "env/home/.pm2/logs")
    const errorPath = path.resolve(logsPath, "pm2-error-0.log")

    const nodeArgs = ["-r", pkgPath, "-r", "@babel/register"]
    const pm2Args = [
      "start",
      "--no-autorestart",
      "--name", "pm2",
      "--node-args", nodeArgs.join(" "),
      indexPath
    ]

    return Promise.resolve()
      .then(() => trash([logsPath]))
      .then(() => exec("pm2", ["kill"]))
      .then(() => exec("pm2", pm2Args))
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() => {
        const errorLog = fs.readFileSync(errorPath, "utf8")
        assert.strictEqual(errorLog, "")
      })
  })
})
