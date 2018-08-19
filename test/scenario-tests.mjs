import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import trash from "../script/trash.js"

const isWin = process.platform === "win32"

const pkgPath = path.resolve("../index.js")
const testPath = path.resolve(".")
const nodePath = path.resolve(testPath, "env/prefix", isWin ? "node.exe" : "bin/node")

const canTestJest = Reflect.has(process.versions, "v8")
const canTestLab = SemVer.satisfies(process.version, ">=7.6.0")
const canTestPM2 = ! Reflect.has(process.env, "TRAVIS")

const defaultNodeArgs = [
  "--no-deprecation"
]

const envAuto = {
  CI: 1,
  ESM_OPTIONS: "{cjs:true,mode:'auto'}"
}

function exec(filename, args, env) {
  return execa(filename, args, {
    cwd: testPath,
    env
  })
}

function node(args, env) {
  return exec(nodePath, defaultNodeArgs.concat(args), env)
}

describe("scenario tests", function () {
  this.timeout(0)

  it("should work with dual packages", () =>
    [
      "index.js",
      "index.mjs"
    ]
    .reduce((promise, basename) =>
      promise
        .then(() =>
          node([
            "-r", pkgPath,
            path.resolve(testPath, "fixture/scenario/dual", basename)
          ])
        )
    , Promise.resolve())
  )

  it("should work with ava", () =>
    exec("ava", [
      path.resolve(testPath, "fixture/scenario/ava/test.js")
    ], envAuto)
  )

  it("should expose babel errors", () =>
    node([
      "-r", pkgPath,
      "-r", "@babel/register",
      path.resolve(testPath, "fixture/scenario/babel-error")
    ])
    .then(() => assert.ok(false))
    .catch(({ stderr }) => {
      assert.ok(stderr.includes("Support for the experimental syntax 'importMeta' isn't currently enabled"))
    })
  )

  it("should work with babel plugins (code)", () =>
    node([
      path.resolve(testPath, "fixture/scenario/babel-flow")
    ])
  )

  it("should work with babel plugins (flag)", () =>
    node([
      "-r", pkgPath,
      "-r", "@babel/register",
      path.resolve(testPath, "fixture/scenario/babel-flow")
    ])
  )

  it("should work with ts-node/register/transpile-only", () =>
    node([
      "-r", pkgPath,
      "-r", "ts-node/register/transpile-only",
      path.resolve(testPath, "fixture/scenario/ts-node/index.ts")
    ])
    .then(({ stdout }) => assert.ok(stdout === "ts-node"))
  )

  it("should work with esmod-pmb", () =>
    node([
      path.resolve(testPath, "fixture/scenario/esmod-pmb/test.node.js")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("esmod-pmb:true")))
  )

  it("should work with express", () =>
    node([
      path.resolve(testPath, "fixture/scenario/express")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("express:true")))
  )

  it("should work with global-prefix", () =>
    node([
      path.resolve(testPath, "fixture/scenario/global-prefix")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("global-prefix:true")))
  )

  it("should work with module-alias", () =>
    node([
      path.resolve(testPath, "fixture/scenario/module-alias")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("module-alias:true")))
  )

  it("should work with native modules", () =>
    node([
      path.resolve(testPath, "fixture/scenario/native")
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("native:true")))
  )

  it("should work with newrelic", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/newrelic")
    const cwdPath = path.resolve(dirPath, "cwd.js")

    return node([
      "-r", pkgPath,
      "-r", cwdPath,
      "-r", "newrelic",
      path.resolve(testPath, dirPath)
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("newrelic:true")))
  })

  it("should work with nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/nyc")

    return exec("nyc", [
      "--cwd", dirPath,
      "-i", pkgPath,
      nodePath, ...defaultNodeArgs, dirPath
    ])
  })

  it("should work with postcss", () =>
    node([
      path.resolve(testPath, "fixture/scenario/postcss")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("postcss:true")))
  )

  it("should work with sqreen", () =>
    node([
      "-r", pkgPath,
      "-r", "sqreen",
      path.resolve(testPath, "fixture/scenario/sqreen")
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("sqreen:true")))
  )

  it("should work with ava and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const avaPattern = path.resolve(dirPath, "test.js")

    return exec("nyc", [
      "--cwd", dirPath,
      "-i", cwdPath,
      "ava", avaPattern
    ], envAuto)
  })

  it("should work with ava, nyc, and tsc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc-tsc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const avaPattern = path.resolve(dirPath, "test.js")

    return exec("tsc", [
        "--project", dirPath
      ])
      .then(() => exec("nyc", [
        "--cwd", dirPath,
        "-i", cwdPath,
        "-i", pkgPath,
        "ava", avaPattern
      ], envAuto))
  })

  it("should work with babel, mocha, and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/babel-mocha-nyc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const mochaPattern = path.resolve(dirPath, "test.js")

    return exec("nyc", [
      "--cwd", dirPath,
      "-x", ".babelrc.js", "-x", "test.js",
      "-i", cwdPath,
      "-i", pkgPath,
      "-i", "@babel/register",
      "-i", "@babel/polyfill",
      "mocha", mochaPattern
    ], envAuto)
  })

  it("should work with chai, mocha, and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/chai-mocha-nyc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const mochaPattern = path.resolve(dirPath, "test.js")

    return exec("nyc", [
      "--cwd", dirPath,
      "-i", cwdPath,
      "-i", pkgPath,
      "mocha", mochaPattern
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("chai-mocha-nyc:true")))
  })

  it("should work with mocha and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/mocha-nyc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const mochaPattern = path.resolve(dirPath, "test.js")

    return exec("nyc", [
      "--cwd", dirPath,
      "-x", "test.js",
      "-i", cwdPath,
      "-i", pkgPath,
      "mocha", mochaPattern
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("mocha-nyc:true")))
  })

  it("should work with mock-require and require-inject", () =>
    node([
      "-r", pkgPath,
      path.resolve(testPath, "fixture/scenario/mock-require-inject")
    ], envAuto)
  )

  describe("should work with jest", () => {
    before(function () {
      if (! canTestJest) {
        this.skip()
      }
    })

    it("should carry over the context object of jest", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-context")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return exec("jest", [
        "--config", configPath,
        "--rootDir", dirPath
      ], envAuto)
    })

    it("should carry over the process object of jest", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-process")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return exec("jest", [
        "--config", configPath,
        "--rootDir", dirPath
      ], envAuto)
    })

    it("should carry over globals from `jest.config.json`", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-config-globals")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return exec("jest", [
        "--config", configPath,
        "--rootDir", dirPath
      ], envAuto)
    })

    it("should use an empty module cache with jest", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-module-cache")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return exec("jest", [
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })

    it("should work with jest subclassed console", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-console")
      const configPath = path.resolve(dirPath, "jest.config.json")
      const jestPath = path.resolve("../node_modules/jest/bin/jest.js")

      return node([
        "-r", pkgPath,
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })

    it("should work with jest and mock-require", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-mock-require")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return exec("jest", [
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })

    it("should error with jest and circular dependencies", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/jest-cycle")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return exec("jest", [
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })
  })

  describe("should work with lab", function () {
    const labPath = path.resolve("../node_modules/lab/bin/lab")

    before(function () {
      if (! canTestLab) {
        this.skip()
      }
    })

    it("should work with lab", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/lab")
      const labPattern = path.resolve(dirPath, "test.js")

      return exec("node", [
        "-r", pkgPath,
        labPath, labPattern
      ], envAuto)
      .then(({ stdout }) => assert.ok(stdout.includes("lab:true")))
    })

    it("should work with lab and @babel/register", function () {
      const dirPath = path.resolve(testPath, "fixture/scenario/lab-babel")
      const labPattern = path.resolve(dirPath, "test.js")

      return exec("node", [
        "-r", pkgPath,
        "-r", "@babel/register",
        labPath, labPattern
      ], envAuto)
      .then(({ stdout }) => assert.ok(stdout.includes("lab-babel:true")))
    })
  })

  describe("should work with pm2", () => {
    before(function () {
      if (! canTestPM2) {
        this.skip()
      }
    })

    beforeEach(function () {
      return cleanup()
    })

    afterEach(function () {
      return cleanup()
    })

    const defaultPM2Args = [
      "start",
      "--no-autorestart",
      "--name", "pm2"
    ]

    const maxWait = 4000

    const logsPath = path.resolve(testPath, "env/home/.pm2/logs")
    const stderrPath = path.resolve(logsPath, "pm2-error.log")
    const stdoutPath = path.resolve(logsPath, "pm2-out.log")

    function cleanup() {
      return exec("pm2", ["kill"])
        .then(() => trash(logsPath))
    }

    function waitForLogs(stderrPath, stdoutPath) {
      const started = Date.now()

      return new Promise(function check(resolve) {
        const waited = Date.now() - started

        const stderr = fs.existsSync(stderrPath)
          ? fs.readFileSync(stderrPath, "utf8")
          : ""

        const stdout = fs.existsSync(stdoutPath)
          ? fs.readFileSync(stdoutPath, "utf8")
          : ""

        if (stderr ||
            stdout ||
            waited > maxWait) {
          resolve({ stderr, stdout })
        } else {
          setTimeout(() => check(resolve), 100)
        }
      })
    }

    it("should work with pm2 and require flag", () => {
      const nodeArgs = defaultNodeArgs.concat(
        "-r", pkgPath
      )

      const pm2Args = defaultPM2Args.concat(
        "--node-args", nodeArgs.join(" "),
        path.resolve(testPath, "fixture/scenario/pm2")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2:true"))
        })
    })

    it("should work with pm2 and bridge mode", () => {
      const pm2Args = defaultPM2Args.concat(
        "--node-args", defaultNodeArgs.join(" "),
        path.resolve(testPath, "fixture/scenario/pm2/bridge.js")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2:true"))
        })
    })

    it("should work with pm2 and babel/register and require flag", () => {
      const nodeArgs = defaultNodeArgs.concat(
        "-r", pkgPath,
        "-r", "@babel/register"
      )

      const pm2Args = defaultPM2Args.concat(
        "--node-args", nodeArgs.join(" "),
        path.resolve(testPath, "fixture/scenario/pm2-babel")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2-babel:true"))
        })
    })

    it("should work with pm2 and babel/register with bridge mode", () => {
      const pm2Args = defaultPM2Args.concat(
        "--node-args", defaultNodeArgs.join(" "),
        path.resolve(testPath, "fixture/scenario/pm2-babel/bridge.js")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2-babel:true"))
        })
    })
  })
})
