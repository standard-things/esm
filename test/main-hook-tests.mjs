import JSON6 from "json-6"
import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import trash from "../script/trash.js"

const ESM_OPTIONS = JSON6.parse(process.env.ESM_OPTIONS || "{}")

const isDebug = !! ESM_OPTIONS.debug
const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")

const testPath = path.resolve(".")
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

const canUseExperimentalModules =
  Reflect.has(process.versions, "v8") &&
  SemVer.satisfies(process.version, ">=8.5.0")

const canUsePreserveSymlinks =
  SemVer.satisfies(process.version, ">=6.3.0")

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

describe("main hook tests", function () {
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
          .then(({ stdout }) => assert.ok(stdout.includes("main-hook:true")))
      , Promise.resolve())
  })

  it("should support `ESM_OPTIONS` environment variable", function () {
    if (isDebug) {
      this.skip()
      return
    }

    return [
      "{cjs:0,mode:'all'}",
      "{cjs:false,mode:'all'}"
    ]
    .reduce((promise, ESM_OPTIONS) =>
      promise
        .then(() => runMain("./fixture/options/env", { ESM_OPTIONS }))
        .then(({ stdout }) => assert.ok(stdout.includes("esm-options:true")))
    , Promise.resolve())
  })

  it("should support `ESM_OPTIONS` environment variable with `options.cache`", function () {
    if (isDebug) {
      this.skip()
      return
    }

    const execPath = path.resolve(testPath, "fixture/options/env-cache")
    const cachePath = path.resolve(execPath, ".cache")
    const ESM_OPTIONS = "{cache:'" + cachePath.replace(/\\/g, "\\\\") + "'}"

    return trash(cachePath)
      .then(() => runMain(execPath, { ESM_OPTIONS }))
      .then(() => assert.ok(fs.pathExistsSync(cachePath)))
  })

  it("should support dynamic import in CJS", () =>
    runMain("./fixture/main-hook/dynamic-import.js")
      .then(({ stdout }) => assert.ok(stdout.includes("dynamic-import-cjs:true")))
  )

  it("should support `import.meta.url` in ESM", () =>
    runMain("./fixture/main-hook/import-meta.mjs")
      .then(({ stdout }) => {
        const url = testURL + "/fixture/main-hook/import-meta.mjs"
        const expected = JSON.stringify({ url })

        assert.ok(stdout.includes("import-meta:" + expected))
      })
  )

  it("should support query fragments in ESM", () =>
    runMain("./fixture/main-hook/query-fragment.js?foo=bar")
      .then(({ stdout }) => {
        const url = testURL + "/fixture/main-hook/query-fragment.js?foo=bar"

        assert.ok(stdout.includes("query-fragment:" + url))
      })
  )

  it("should expose `require.main` in CJS", () =>
    runMain("./fixture/main-hook/require-main.js")
      .then(({ stdout }) => assert.ok(stdout.includes("require-main:true")))
  )

  it("should not expose `process.mainModule` in ESM", () =>
    runMain("./fixture/main-hook/main-module/off")
      .then(({ stdout }) => assert.ok(stdout.includes("main-module:false")))
  )

  it("should expose `process.mainModule` in ESM with `options.cjs.cache`", () =>
    runMain("./fixture/main-hook/main-module/on")
      .then(({ stdout }) => assert.ok(stdout.includes("main-module:true")))
  )

  it("should treat extensionless files as CJS", () =>
    runMain("./fixture/ext/no-ext-cjs")
      .then(({ stderr }) => assert.strictEqual(stderr, ""))
      .then(() => runMain("./fixture/ext/no-ext-esm"))
      .then(({ stderr }) => assert.ok(stderr))
  )

  it("should support loading `@std/esm`", () =>
    runMain("./fixture/main-hook/std-esm.js")
      .then(({ stdout }) => {
        const exported = { a: "a", b: "b", c: "c", default: "default" }
        const expected = JSON.stringify(exported)

        assert.ok(stdout.includes("std-esm:" + expected))
      })
  )

  it("should error for missing modules", () => {
    const fileNames = ["missing", "missing.js", "missing.mjs"]
    const flags = [""]
    const runs = []

    if (canUsePreserveSymlinks) {
      flags.push("--preserve-symlinks")
    }

    fileNames.forEach((fileName) => {
      flags.forEach((flag) => {
        const args = flag ? [flag] : []

        args.push("-r", "../", fileName)
        runs.push(args)
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then(({ stderr }) => assert.ok(stderr.includes("Cannot find module")))
      , Promise.resolve())
  })

  it("should not swallow async errors", () =>
    runMain("./fixture/main-hook/async-error.mjs")
      .then(({ stderr }) => {
        assert.ok(stderr)
        assert.strictEqual(stderr.includes("async hook stack has become corrupted"), false)
      })
  )

  it("should not preserve symlinks", () => {
    const destNames = ["symlink.js",  "symlink.mjs"]
    const flags = [""]
    const runs = []

    if (canUsePreserveSymlinks) {
      flags.push("--preserve-symlinks")
    }

    flags.forEach((flag) => {
      destNames.forEach((destName) => {
        const args = flag ? [flag] : []

        args.push("-r", "../", "./fixture/main-hook/symlink/" + destName)
        runs.push(args)
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => {
            const destPath = args[args.length - 1]
            const ext = path.extname(destPath)
            const srcPath = "./fixture/main-hook/symlink/real" + ext

            return fs
              .ensureSymlink(srcPath, destPath)
              .then(() => node(args))
              .then(({ stdout }) => assert.ok(stdout.includes("symlink:true")))
              .then(() => fs.remove(destPath))
          })
      , Promise.resolve())
  })
})
