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
const canTestPM2 = ! Reflect.has(process.env, "TRAVIS")

const envAuto = {
  ESM_OPTIONS: "{cjs:true,mode:'auto'}"
}

function exec(filename, args, env) {
  return execa(filename, args, {
    cwd: testPath,
    env
  })
}

describe("scenarios", function () {
  this.timeout(0)

  it("should work with ava", () =>
    exec("ava", [path.resolve(testPath, "fixture/scenario/ava/test.js")])
  )

  it("should work with dual packages", () =>
    [
      "index.js",
      "index.mjs"
    ]
    .reduce((promise, basename) =>
      promise
        .then(() =>
          exec(nodePath, [
            "-r", pkgPath,
            path.resolve(testPath, "fixture/scenario/dual", basename)
          ])
        )
    , Promise.resolve())
  )

  it("should work with esmod-pmb", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/esmod-pmb/test.node.js")])
  )

  it("should work with express", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/express")])
  )

  it("should work with global-prefix", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/global-prefix")])
  )

  it("should work with module-alias", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/module-alias")])
  )

  it("should work with native modules", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/native")])
  )

  it("should work with nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/nyc")

    return exec("nyc", [
      "--cwd", dirPath,
      "-i", pkgPath,
      nodePath, dirPath
    ])
  })

  it("should work with postcss", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/postcss")])
  )

  it("should work with ava and nyc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc")
    const cwdPath = path.resolve(dirPath, "cwd.js")
    const avaPattern = path.resolve(dirPath, "test.js")

    return exec("nyc", [
      "--cwd", dirPath,
      "-i", cwdPath,
      "ava", avaPattern
    ])
  })

  it("should work with ava, nyc, and tsc", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/ava-nyc-tsc")
    const avaPattern = path.resolve(dirPath, "test.js")

    return Promise
      .resolve()
      .then(() => exec("tsc", [
        "--project", dirPath
      ]))
      .then(() => exec("nyc", [
        "--cwd", dirPath,
        "-i", pkgPath,
        "ava", avaPattern
      ]))
  })

  it("should work with babel and plugins (code)", () =>
    exec(nodePath, [path.resolve(testPath, "fixture/scenario/babel-flow")])
  )

  it("should work with babel and plugins (flag)", () =>
    exec(nodePath, [
      "-r", pkgPath,
      "-r", "@babel/register",
      path.resolve(testPath, "fixture/scenario/babel-flow")
    ])
  )

  it("should expose babel errors", () =>
    exec(nodePath, [
      "-r", pkgPath,
      "-r", "@babel/register",
      path.resolve(testPath, "fixture/scenario/babel-error")
    ])
    .then(() => assert.ok(false))
    .catch((result) => {
      assert.ok(result.stderr.includes("Support for the experimental syntax 'importMeta' isn't currently enabled"))
    })
  )

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
  })

  ;(canTestJest ? it : xit)(
  "should work with jest and mock-require", () => {
    const dirPath = path.resolve(testPath, "fixture/scenario/jest-mock-require")
    const configPath = path.resolve(dirPath, "jest.config.json")

    return exec("jest", [
      "--config", configPath,
      "--rootDir", dirPath
    ])
  })

  ;(canTestPM2 ? it : xit)(
  "should work with pm2", () => {
    const logsPath = path.resolve(testPath, "env/home/.pm2/logs")
    const errorPath = path.resolve(logsPath, "pm2-error-0.log")

    const nodeArgs = [
      "-r", pkgPath,
      "-r", "@babel/register"
    ]

    const pm2Args = [
      "start",
      "--no-autorestart",
      "--name", "pm2",
      "--node-args", nodeArgs.join(" "),
      path.resolve(testPath, "fixture/scenario/babel")
    ]

    return Promise
      .resolve()
      .then(() => trash(logsPath))
      .then(() => exec("pm2", ["kill"]))
      .then(() => exec("pm2", pm2Args))
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() => assert.strictEqual(fs.readFileSync(errorPath, "utf8"), ""))
  })
})
