import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import trash from "../script/trash.js"

const isTravis = Reflect.has(process.env, "TRAVIS")
const isWin = process.platform === "win32"

const canTestLab = SemVer.satisfies(process.version, ">=7.6")
const canTestPM2 = ! isTravis

const avaPath = path.resolve("../node_modules/ava/cli.js")
const jasminePath = path.resolve("../node_modules/jasmine/bin/jasmine.js")
const jestPath = path.resolve("../node_modules/jest/bin/jest.js")
const labPath = path.resolve("../node_modules/lab/bin/lab")
const pkgPath = path.resolve("../index.js")
const nodePath = path.resolve("env/prefix", isWin ? "node.exe" : "bin/node")
const testPath = path.resolve(".")

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
            path.resolve("fixture/scenario/dual", basename)
          ])
        )
    , Promise.resolve())
  )

  it("should expose babel errors", () =>
    node([
      "-r", pkgPath,
      "-r", "@babel/register",
      path.resolve("fixture/scenario/babel-error/index.js")
    ])
    .then(assert.fail)
    .catch(({ stderr }) => {
      assert.ok(stderr.includes("'importMeta' isn't currently enabled"))
    })
  )

  it("should work with esmod-pmb", () =>
    node([
      path.resolve("fixture/scenario/esmod-pmb/test.node.js")
    ])
  )

  it("should work with express", () =>
    node([
      path.resolve("fixture/scenario/express/index.js")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("express:true")))
  )

  it("should work with global-prefix", () =>
    node([
      path.resolve("fixture/scenario/global-prefix/index.js")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("global-prefix:true")))
  )

  it("should work with jasmine", () => {
    const dirPath = path.resolve("fixture/scenario/jasmine-helpers")
    const configPath = path.resolve(dirPath, "jasmine.json")
    const cwdPath = path.resolve(dirPath, "cwd.js")

    return node([
      "-r", cwdPath,
      jasminePath, "--config=" + configPath
    ], envAuto)
  })

  it("should work with lit-node", () =>
    node([
      "-r", pkgPath,
      "-r", "lit-node/register",
      path.resolve("fixture/scenario/lit-node")
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("lit-node:true")))
  )

  it("should work with mocha", () =>
    exec("mocha", [
      "-r", pkgPath,
      path.resolve("fixture/scenario/mocha")
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("mocha:true")))
  )

  it("should work with module-alias", () =>
    node([
      path.resolve("fixture/scenario/module-alias")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("module-alias:true")))
  )

  it("should work with native modules", () =>
    node([
      "-r", pkgPath,
      path.resolve("fixture/scenario/native")
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("native:true")))
  )

  it("should work with newrelic", () => {
    const dirPath = path.resolve("fixture/scenario/newrelic")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const filename = path.resolve(dirPath, "index.js")

    return node([
      "-r", pkgPath,
      "-r", cwdPath,
      "-r", "newrelic",
      filename
    ])
  })

  it("should work with nyc", () => {
    const dirPath = path.resolve("fixture/scenario/nyc")
    const filename = path.resolve(dirPath, "index.js")

    return exec("nyc", [
      "--cwd", dirPath,
      "-i", pkgPath,
      nodePath, ...defaultNodeArgs, filename
    ])
  })

  it("should work with postcss", () =>
    node([
      path.resolve("fixture/scenario/postcss")
    ])
  )

  it("should work with proxyquire", () =>
    node([
      "-r", pkgPath,
      path.resolve("fixture/scenario/proxyquire")
    ], envAuto)
  )

  it("should work with requizzle", () =>
    node([
      "-r", pkgPath,
      path.resolve("fixture/scenario/requizzle")
    ], envAuto)
    .then(({ stdout }) => assert.ok(stdout.includes("requizzle:true")))
  )

  it("should work with rewire", () =>
    node([
      "-r", pkgPath,
      path.resolve("fixture/scenario/rewire")
    ], envAuto)
  )

  it("should work with sinon", () =>
    node([
      path.resolve("fixture/scenario/sinon")
    ], envAuto)
  )

  it("should work with sqreen", () =>
    node([
      "-r", pkgPath,
      "-r", "sqreen",
      path.resolve("fixture/scenario/sqreen")
    ], envAuto)
  )

  it("should work with ts-node", () =>
    Promise
      .all([
        "ts-node/register",
        "ts-node/register/transpile-only"
      ]
      .map((request) =>
        node([
          "-r", pkgPath,
          "-r", request,
          path.resolve("fixture/scenario/ts-node/index.ts")
        ], envAuto)
        .then(({ stdout }) => assert.ok(stdout.includes("ts-node:true")))
      ))
  )

  it("should work with unexpected", () =>
    node([
      "-r", pkgPath,
      path.resolve("fixture/scenario/unexpected")
    ])
    .then(({ stdout }) => assert.ok(stdout.includes("unexpected:true")))
  )

  it("should work with webpack", () => {
    const dirPath = path.resolve("fixture/scenario/webpack")
    const configPath = path.resolve(dirPath, "webpack.config.js")
    const entryPath = path.resolve(dirPath, "index.js")
    const outputPath = path.resolve(dirPath, "output.js")

    return exec("webpack", [
      "--config-register", pkgPath,
      "--config", configPath,
      "--entry", entryPath,
      "--mode", "production",
      "--output", outputPath
    ], envAuto)
  })

  it("should work with babel, mocha, and nyc", () => {
    const dirPath = path.resolve("fixture/scenario/babel-mocha-nyc")
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
    const dirPath = path.resolve("fixture/scenario/chai-mocha-nyc")
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
    const dirPath = path.resolve("fixture/scenario/mocha-nyc")
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
      path.resolve("fixture/scenario/mock-require-inject")
    ], envAuto)
  )

  describe("should work with ava", () => {
    it("should work from the `esm` bridge", () =>
      exec("ava", [
        path.resolve("fixture/scenario/ava/bridge.test.js")
      ], envAuto)
    )

    it("should work from the Node CLI", () => {
      const avaPattern = path.resolve("fixture/scenario/ava/cli.test.js")

      return node([
        "-r", pkgPath,
        avaPath, avaPattern
      ], envAuto)
    })

    it("should work with ava and core-js", () => {
      const dirPath = path.resolve("fixture/scenario/ava-core-js")
      const cwdPath = path.resolve(dirPath, "cwd.js")
      const avaPattern = path.resolve(dirPath, "test.js")

      return node([
        "-r", cwdPath,
        avaPath, avaPattern
      ], envAuto)
    })

    it("should work with ava and nyc", () => {
      const dirPath = path.resolve("fixture/scenario/ava-nyc")
      const cwdPath = path.resolve(dirPath, "cwd.js")
      const avaPattern = path.resolve(dirPath, "test.js")

      return exec("nyc", [
        "--cwd", dirPath,
        "-i", cwdPath,
        "ava", avaPattern
      ], envAuto)
    })

    it("should work with ava and sinon", () => {
      const dirPath = path.resolve("fixture/scenario/ava-sinon")
      const cwdPath = path.resolve(dirPath, "cwd.js")
      const avaPattern = path.resolve(dirPath, "test.js")

      return node([
        "-r", cwdPath,
        avaPath, avaPattern
      ], envAuto)
    })

    it("should work with ava, nyc, and sinon", () => {
      const dirPath = path.resolve("fixture/scenario/ava-nyc-sinon")
      const cwdPath = path.resolve(dirPath, "cwd.js")
      const avaPattern = path.resolve(dirPath, "test.js")

      return exec("nyc", [
        "--cwd", dirPath,
        "-i", cwdPath,
        "ava", avaPattern
      ], envAuto)
    })

    it("should work with ava, nyc, and tsc", () => {
      const dirPath = path.resolve("fixture/scenario/ava-nyc-tsc")
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
  })

  describe("should work with babel plugins", () => {
    it("should work from the `esm` bridge", () =>
      node([
        path.resolve("fixture/scenario/babel-flow")
      ])
      .then(({ stdout }) => assert.ok(stdout.includes("babel-flow:true")))
    )

    it("should work from the Node CLI", () =>
      node([
        "-r", pkgPath,
        "-r", "@babel/register",
        path.resolve("fixture/scenario/babel-flow/main.js")
      ])
      .then(({ stdout }) => assert.ok(stdout.includes("babel-flow:true")))
    )
  })

  describe("should work with flow-remove-types", () => {
    it("should work from the `esm` bridge",  () =>
      node([
        path.resolve("fixture/scenario/flow-remove-types")
      ], envAuto)
      .then(({ stdout }) => assert.ok(stdout.includes("flow-remove-types:true")))
    )

    it("should work from the Node CLI", () =>
      node([
        "-r", pkgPath,
        "-r", "flow-remove-types/register",
        path.resolve("fixture/scenario/flow-remove-types/main.js")
      ], envAuto)
      .then(({ stdout }) => assert.ok(stdout.includes("flow-remove-types:true")))
    )
  })

  describe("should work with jest", () => {
    it("should carry over the context object of jest", function () {
      const dirPath = path.resolve("fixture/scenario/jest-context")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ], envAuto)
    })

    it("should carry over the process object of jest", function () {
      const dirPath = path.resolve("fixture/scenario/jest-process")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ], envAuto)
    })

    it("should carry over globals from `jest.config.json`", function () {
      const dirPath = path.resolve("fixture/scenario/jest-config-globals")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ], envAuto)
    })

    it("should use an empty module cache with jest", function () {
      const dirPath = path.resolve("fixture/scenario/jest-module-cache")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })

    it("should work with jest subclassed console", function () {
      const dirPath = path.resolve("fixture/scenario/jest-console")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        "-r", pkgPath,
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })

    it("should work with jest and mock-require", function () {
      const dirPath = path.resolve("fixture/scenario/jest-mock-require")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })

    it("should error with jest and circular dependencies", function () {
      const dirPath = path.resolve("fixture/scenario/jest-cycle")
      const configPath = path.resolve(dirPath, "jest.config.json")

      return node([
        jestPath,
        "--config", configPath,
        "--rootDir", dirPath
      ])
    })
  })

  describe("should work with lab", function () {
    before(function () {
      if (! canTestLab) {
        this.skip()
      }
    })

    it("should work with lab", () =>
      node([
        "-r", pkgPath,
        labPath, path.resolve("fixture/scenario/lab/test.js")
      ], envAuto)
    )

    it("should work with lab and @babel/register", () =>
      node([
        "-r", pkgPath,
        "-r", "@babel/register",
        labPath, path.resolve("fixture/scenario/lab-babel/test.js")
      ], envAuto)
    )
  })

  describe("should work with pm2", () => {
    before(function () {
      if (! canTestPM2) {
        this.skip()
      }
    })

    beforeEach(beforeAndAfterEach)
    afterEach(beforeAndAfterEach)

    const MAX_WAIT = 10000

    const logsPath = path.resolve("env/home/.pm2/logs")
    const stderrPath = path.resolve(logsPath, "pm2-error.log")
    const stdoutPath = path.resolve(logsPath, "pm2-out.log")

    const defaultPM2Args = [
      "start",
      "--no-autorestart",
      "--name", "pm2"
    ]

    function beforeAndAfterEach() {
      if (! canTestPM2) {
        this.skip()
      }

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
            waited > MAX_WAIT) {
          resolve({ stderr, stdout })
        } else {
          setTimeout(() => check(resolve), 100)
        }
      })
    }

    it("should work from the `esm` bridge", () => {
      const pm2Args = defaultPM2Args.concat(
        "--node-args", defaultNodeArgs.join(" "),
        path.resolve("fixture/scenario/pm2")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2:true"))
        })
    })

    it("should work from the Node CLI", () => {
      const nodeArgs = defaultNodeArgs.concat(
        "-r", pkgPath
      )

      const pm2Args = defaultPM2Args.concat(
        "--node-args", nodeArgs.join(" "),
        path.resolve("fixture/scenario/pm2/main.js")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2:true"))
        })
    })

    it("should work with babel/register from the `esm` bridge", () => {
      const pm2Args = defaultPM2Args.concat(
        "--node-args", defaultNodeArgs.join(" "),
        path.resolve("fixture/scenario/pm2-babel")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2-babel:true"))
        })
    })

    it("should work with babel/register from the Node CLI", () => {
      const nodeArgs = defaultNodeArgs.concat(
        "-r", pkgPath,
        "-r", "@babel/register"
      )

      const pm2Args = defaultPM2Args.concat(
        "--node-args", nodeArgs.join(" "),
        path.resolve("fixture/scenario/pm2-babel/main.js")
      )

      return exec("pm2", pm2Args)
        .then(() => waitForLogs(stderrPath, stdoutPath))
        .then(({ stderr, stdout }) => {
          assert.strictEqual(stderr, "")
          assert.ok(stdout.includes("pm2-babel:true"))
        })
    })
  })

  describe("should work with `util.inspect()`", () => {
    it("should work from the `esm` bridge without options", () =>
      node([
        path.resolve("fixture/scenario/inspect/without-options.js")
      ])
      .then(({ stdout }) => assert.ok(stdout.includes("inspect:true")))
    )

    it("should work from the `esm` bridge with options", () =>
      node([
        path.resolve("fixture/scenario/inspect/with-options.js")
      ])
      .then(({ stdout }) => assert.ok(stdout.includes("inspect:true")))
    )
  })
})
