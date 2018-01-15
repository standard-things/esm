import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"
import trash from "../script/trash.js"

const canTestPM2 = ! ("TRAVIS" in process.env)

const isWin = process.platform === "win32"

const pkgPath = require.resolve("../")
const testPath = path.dirname(require.resolve("./tests.mjs"))
const nodePath = path.resolve(testPath, "env/prefix", isWin ? "node.exe" : "bin/node")

function exec(filePath, args) {
  return execa(filePath, args, {
    cwd: testPath
  })
}

describe("scenarios", function () {
  this.timeout(0)

  it("should work with babel-register (flag)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const indexPath = path.resolve(dirPath, "index.js")

    const nodeArgs = ["-r", pkgPath, "-r", "@babel/register", indexPath]

    return Promise.resolve()
      .then(() => exec("node", nodeArgs))
  })

  it("should work with babel-register (code)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register")
    const mainPath = path.resolve(dirPath, "main.js")

    return Promise.resolve()
      .then(() => exec("node", mainPath))
  })

  it("should work with ava, nyc, and tsc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc-tsc")
    const avaPattern = path.resolve(dirPath, "test.js")
    const tscArgs = ["--project", dirPath]
    const nycArgs = [
      "--cwd", dirPath,
      "-i", pkgPath,
      "ava", avaPattern
    ]

    return Promise.resolve()
      .then(() => exec("tsc", tscArgs))
      .then(() => exec("nyc", nycArgs))
  })

  it("should work with babel, mocha, and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-mocha-nyc")
    const mochaPattern = path.resolve(dirPath, "test.js")
    const nycArgs = [
      "--cwd", dirPath,
      "-x", ".babelrc.js", "-x", "test.js",
      "-i", pkgPath, "-i", "@babel/register", "-i", "@babel/polyfill",
      "mocha", mochaPattern
    ]

    return Promise.resolve()
      .then(() => fs.outputFileSync(".esmrc", "'cjs'"))
      .then(() => exec("nyc", nycArgs))
      .then(() => fs.removeSync(".esmrc"))
  })

  it("should work with chai, mocha, and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/chai-mocha-nyc")
    const mochaPattern = path.resolve(dirPath, "test.js")
    const nycArgs = [
      "--cwd", dirPath,
      "-i", pkgPath,
      "mocha", mochaPattern
    ]

    return Promise.resolve()
      .then(() => fs.outputFileSync(".esmrc", "'cjs'"))
      .then(() => exec("nyc", nycArgs))
      .then(() => fs.removeSync(".esmrc"))
  })

  it("should work with jest and mock-require", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/jest-mock-require")
    const configPath = path.resolve(dirPath, "jest.config.json")
    const jestArgs = ["--config", configPath, "--rootDir", dirPath]

    return exec("jest", jestArgs)
  })

  it("should work with express", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/express")])
  )

  it("should work with native modules", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/native")])
  )

  it("should work with nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/nyc")
    const nycArgs = [
      "--cwd", dirPath,
      "-i", pkgPath,
      nodePath, dirPath
    ]

    return exec("nyc", nycArgs)
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
      .then(() => trash(logsPath))
      .then(() => exec("pm2", ["kill"]))
      .then(() => exec("pm2", pm2Args))
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() => assert.strictEqual(fs.readFileSync(errorPath, "utf8"), ""))
  })
})
