import JSON6 from "json-6"
import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import trash from "../script/trash.js"
import vm from "vm"

const canUseExperimentalModules =
  "v8" in process.versions &&
  SemVer.satisfies(process.version, ">=8.5.0")

const canUsePreserveSymlinks =
  SemVer.satisfies(process.version, ">=6.3.0")

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const pkgPath = path.resolve("../index.js")
const pkgJSON = JSON6.parse(fs.readFileSync("../package.json"))
const pkgOptions = fs.pathExistsSync(".esmrc")
  ? JSON6.parse(fs.readFileSync(".esmrc"))
  : pkgJSON["@std/esm"]

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

function node(args, env) {
  return execa(process.execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

function runMain(filename, env) {
  return node(["-r", "../", filename], env)
}

describe("main hook", function () {
  this.timeout(0)

  it("should support `-r` and `--require` flags", () => {
    const otherFlags = ["", "--no-deprecation"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    if (canUseExperimentalModules) {
      otherFlags.push("--experimental-modules")
    }

    requireFlags.forEach((requireFlag) => {
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push(requireFlag, "../", "./fixture/main-hook")
        runs.push(args)
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => assert.ok(result.stdout.includes("main-hook:true")))
      , Promise.resolve())
  })

  it("should support `ESM_OPTIONS` environment variable", function () {
    if (pkgOptions.debug) {
      this.skip()
      return
    }

    return [
      "'cjs'",
      "{cjs:1,esm:'js'}",
      "{cjs:true,esm:'js'}"
    ].reduce((promise, ESM_OPTIONS) =>
      promise
        .then(() => runMain("./fixture/options/env", { ESM_OPTIONS }))
        .then((result) => {
          assert.strictEqual(result.stderr, "")
          assert.ok(result.stdout.includes("esm-options:true"))
        })
    , Promise.resolve())
  })

  it("should support `ESM_OPTIONS` environment variable with `options.cache`", function () {
    if (pkgOptions.debug) {
      this.skip()
      return
    }

    const execPath = path.resolve(testPath, "fixture/options/env")
    const cachePath = path.resolve(execPath, ".cache")

    const ESM_OPTIONS =
      "{cache:'" +
      cachePath.replace(/\\/g, "\\\\") +
      "',esm:'cjs'}"

    return runMain(execPath, { ESM_OPTIONS })
      .then(() => {
        const pathExists = fs.pathExistsSync(cachePath)

        return trash(cachePath)
          .then(() => assert.ok(pathExists))
      })
  })

  it("should support dynamic import in CJS", () =>
    runMain("./fixture/main-hook/dynamic-import.js")
      .then((result) => {
        assert.strictEqual(result.stderr, "")
        assert.ok(result.stdout.includes("dynamic-import-cjs:true"))
      })
  )

  it("should support `import.meta.url`", () =>
    runMain("./fixture/main-hook/import-meta.mjs")
      .then((result) => {
        const url = testURL + "/fixture/main-hook/import-meta.mjs"
        const expected = JSON.stringify({ url })
        assert.ok(result.stdout.includes("import-meta:" + expected))
      })
  )

  it("should not expose ESM in `process.mainModule`", () =>
    runMain("./fixture/main-hook/main-module/off")
      .then((result) => {
        assert.strictEqual(result.stderr, "")
        assert.ok(result.stdout.includes("main-module:false"))
      })
  )

  it("should expose ESM in `process.mainModule` with `options.cjs.cache`", () =>
    runMain("./fixture/main-hook/main-module/on")
      .then((result) => {
        assert.strictEqual(result.stderr, "")
        assert.ok(result.stdout.includes("main-module:true"))
      })
  )

  it("should error for missing modules", () => {
    const fileNames = ["missing", "missing.js", "missing.mjs"]
    const otherFlags = [""]
    const runs = []

    if (canUsePreserveSymlinks) {
      otherFlags.push("--preserve-symlinks")
    }

    fileNames.forEach((fileName) => {
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push("-r", "../", fileName)
        runs.push(args)
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => assert.ok(result.stderr.includes("Cannot find module")))
      , Promise.resolve())
  })
})
