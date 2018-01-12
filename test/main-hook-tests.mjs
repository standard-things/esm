import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import require from "./require.js"
import trash from "../script/trash.js"

const canTestMissingModuleErrors =
  ! ("TRAVIS" in process.env &&
     SemVer.satisfies(process.version, "^7"))

const canUseExperimentalModules =
  process.jsEngine !== "chakracore" &&
  SemVer.satisfies(process.version, ">=8.5.0")

const canUsePreserveSymlinks =
  SemVer.satisfies(process.version, ">=6.3.0")

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.dirname(require.resolve("./tests.mjs"))
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

function node(args, env) {
  return execa(process.execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

function runMain(filePath, env) {
  return node(["-r", "../index.js", filePath], env)
}

describe("module.runMain hook", function () {
  this.timeout(0)

  it("should support Node -r and --require", () => {
    const otherFlags = ["", "--no-deprecation"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    if (canUseExperimentalModules) {
      otherFlags.push("--experimental-modules")
    }

    requireFlags.forEach((requireFlag) => {
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push(requireFlag, "../index.js", "./fixture/main/main-module.mjs")
        runs.push(args)
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => assert.ok(result.stdout.includes("main-module:false")))
      , Promise.resolve())
  })

  it("should support `ESM_OPTIONS` environment variable", () =>
    [
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
  )

  it("should support setting `options.cache` with the `ESM_OPTIONS` environment variable", () => {
    const execPath = path.resolve("./fixture/options/env")
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
    runMain("./fixture/main/dynamic-import.js")
      .then((result) => {
        assert.strictEqual(result.stderr, "")
        assert.ok(result.stdout.includes("dynamic-import-cjs:true"))
      })
  )

  it("should support `import.meta.url`", () =>
    runMain("./fixture/main/import-meta.mjs")
      .then((result) => {
        const url = testURL + "/fixture/main/import-meta.mjs"
        const expected = JSON.stringify({ url })
        assert.ok(result.stdout.includes("import-meta:" + expected))
      })
  )

  it("should not expose ESM in `process.mainModule`", () =>
    runMain("./fixture/main/main-module/off")
      .then((result) => {
        assert.strictEqual(result.stderr, "")
        assert.ok(result.stdout.includes("main-module:false"))
      })
  )

  it("should expose ESM in `process.mainModule` with `options.cjs.cache`", () =>
    runMain("./fixture/main/main-module/on")
      .then((result) => {
        assert.strictEqual(result.stderr, "")
        assert.ok(result.stdout.includes("main-module:true"))
      })
  )

  ;(canTestMissingModuleErrors ? it : xit)(
  "should error for missing modules", function () {
    const fileNames = ["missing", "missing.js", "missing.mjs"]
    const otherFlags = [""]
    const runs = []

    if (canUsePreserveSymlinks) {
      otherFlags.push("--preserve-symlinks")
    }

    fileNames.forEach((fileName) => {
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push("-r", "../index.js", fileName)
        runs.push(args)
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => assert.ok(result.stderr.includes("ERR_MISSING_MODULE")))
      , Promise.resolve())
  })
})
