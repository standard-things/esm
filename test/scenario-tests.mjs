import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import trash from "../script/trash.js"

const canTestPM2 =
  "v8" in process.versions &&
  ! ("TRAVIS" in process.env)

const isWin = process.platform === "win32"

const pkgPath = path.resolve("../index.js")
const testPath = path.resolve(".")
const nodePath = path.resolve(testPath, "env/prefix", isWin ? "node.exe" : "bin/node")

function exec(filePath, args) {
  return execa(filePath, args, {
    cwd: testPath
  })
}

describe("scenarios", function () {
  this.timeout(0)

  it("should work with babel-register and plugins (code)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const indexPath = path.resolve(dirPath, "index.js")

    return Promise.resolve()
      .then(() => exec(nodePath, [indexPath]))
  })

  it("should work with babel-register and plugins (code, reversed require)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const cachePath = path.resolve(dirPath, "node_modules/.cache")
    const indexPath = path.resolve(dirPath, "index-reverse.js")

    return Promise.resolve()
      .then(() => trash(cachePath))
      .then(() => exec(nodePath, [indexPath]))
  })

  it("should work with babel-register and plugins (flag)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const cachePath = path.resolve(dirPath, "node_modules/.cache")
    const mainPath = path.resolve(dirPath, "main.js")
    const nodeArgs = ["-r", pkgPath, "-r", "@babel/register", mainPath]

    return Promise.resolve()
      .then(() => trash(cachePath))
      .then(() => exec(nodePath, nodeArgs))
  })

  it("should work with babel-register and plugins (flag, reverse require)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const cachePath = path.resolve(dirPath, "node_modules/.cache")
    const mainPath = path.resolve(dirPath, "main.js")
    const nodeArgs = ["-r", "@babel/register", "-r", pkgPath, mainPath]

    return Promise.resolve()
      .then(() => trash(cachePath))
      .then(() => exec(nodePath, nodeArgs))
  })

  it("should work with babel-register and plugins (code and flag double hook)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const cachePath = path.resolve(dirPath, "node_modules/.cache")
    const mainPath = path.resolve(dirPath, "index.js")
    const nodeArgs = ["-r", pkgPath, "-r", "@babel/register", mainPath]

    return Promise.resolve()
      .then(() => trash(cachePath))
      .then(() => exec(nodePath, nodeArgs))
  })

  it("should work with babel-register and plugins (code and flag double hook, reverse require)", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-register-flow")
    const cachePath = path.resolve(dirPath, "node_modules/.cache")
    const mainPath = path.resolve(dirPath, "index.js")
    const nodeArgs = ["-r", "@babel/register", "-r", pkgPath, mainPath]

    return Promise.resolve()
      .then(() => trash(cachePath))
      .then(() => exec(nodePath, nodeArgs))
  })

  it("should work with ava and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const avaPattern = path.resolve(dirPath, "test.js")
    const nycArgs = [
      "--cwd", dirPath,
      "-i", cwdPath,
      "ava", avaPattern
    ]

    return Promise.resolve()
      .then(() => exec("nyc", nycArgs))
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

  it("should work with postcss", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/postcss")
    const indexPath = path.resolve(dirPath, "index.js")

    return Promise.resolve()
      .then(() => exec(nodePath, [indexPath]))
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
