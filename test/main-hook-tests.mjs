import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"
import trash from "../script/trash.js"

const isWin = process.platform === "win32"

const canUseExperimentalModules = SemVer.satisfies(process.version, ">=8.5")
const canUsePreserveSymlinks = SemVer.satisfies(process.version, ">=6.3")

const fileProtocol = "file://" + (isWin ? "/" : "")

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
  return node([
    "-r", "../index.js",
    filename
  ], env)
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

    for (const requireFlag of requireFlags) {
      for (const flag of otherFlags) {
        const args = flag ? [flag] : []

        args.push(requireFlag, "../index.js", "./fixture/main-hook/index.mjs")
        runs.push(args)
      }
    }

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then(({ stdout }) => assert.ok(stdout.includes("main-hook:true")))
      , Promise.resolve())
  })

  it("should support `ESM_OPTIONS` environment variable", () =>
    [
      "{cjs:0,mode:'all'}",
      "{cjs:0,mode:all}",
      "{cjs:false,mode:'all'}",
      "{cjs:false,mode:all}"
    ]
    .reduce((promise, ESM_OPTIONS) =>
      promise
        .then(() => runMain("./fixture/main-hook/options/env/index.js", { ESM_OPTIONS }))
        .then(({ stdout }) => assert.ok(stdout.includes("esm-options:true")))
    , Promise.resolve())
  )

  it("should support `ESM_OPTIONS` environment variable with `options.cache`", () => {
    const dirPath = path.resolve("fixture/main-hook/options/env-cache")
    const cachePath = path.resolve(dirPath, ".cache")
    const filename = path.resolve(dirPath, "index.js")

    return trash(cachePath)
      .then(() =>
        runMain(filename, {
          ESM_OPTIONS:  "{cache:'" + cachePath.replace(/\\/g, "\\\\") + "'}"
        })
      )
      .then(() => assert.ok(fs.existsSync(cachePath)))
  })

  it("should support `ESM_OPTIONS` environment variable with `options.mainFields`", () =>
    runMain("./fixture/main-hook/options/env-main-fields/index.js", {
      ESM_OPTIONS: "{mainFields:['module']}"
    })
    .then(({ stdout }) => assert.ok(stdout.includes("esm-options-main-fields:true")))
  )

  it("should support dynamic import in CJS", () =>
    runMain("./fixture/main-hook/dynamic-import.js")
      .then(({ stdout }) => assert.ok(stdout.includes("dynamic-import-cjs:true")))
  )

  it("should support `import.meta.url` in ESM", () => {
    const filename = "fixture/main-hook/import-meta.mjs"

    return runMain(filename)
      .then(({ stdout }) => {
        const url = testURL + "/" + filename
        const expected = JSON.stringify({ url })

        assert.ok(stdout.includes("import-meta:" + expected))
      })
  })

  it("should support filenames with query/fragments in ESM", () => {
    const filename = "fixture/main-hook/query-fragment.js?a#a"

    return runMain(filename)
      .then(({ stdout }) => {
        const url = testURL + "/" + filename

        assert.ok(stdout.includes("query-fragment:" + url))
      })
  })

  it("should expose `require.main` in CJS", () =>
    runMain("./fixture/main-hook/require-main.js")
      .then(({ stdout }) => assert.ok(stdout.includes("require-main:true")))
  )

  it("should not expose `process.mainModule` in ESM", () =>
    runMain("./fixture/main-hook/main-module/off/index.mjs")
      .then(({ stdout }) => assert.ok(stdout.includes("main-module:false")))
  )

  it("should expose `process.mainModule` in ESM with `options.cjs.cache`", () =>
    runMain("./fixture/main-hook/main-module/on/index.mjs")
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
    const filenames = ["missing", "missing.js", "missing.mjs"]
    const flags = [""]
    const runs = []

    if (canUsePreserveSymlinks) {
      flags.push("--preserve-symlinks")
    }

    for (const name of filenames) {
      for (const flag of flags) {
        const args = flag ? [flag] : []

        args.push("-r", "../index.js", name)
        runs.push(args)
      }
    }

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

    for (const flag of flags) {
      for (const destName of destNames) {
        const args = flag ? [flag] : []

        args.push("-r", "../index.js", "./fixture/main-hook/symlink/file/" + destName)
        runs.push(args)
      }
    }

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => {
            const destPath = args[args.length - 1]
            const ext = path.extname(destPath)
            const srcPath = "./fixture/main-hook/symlink/file/real" + ext

            return fs
              .ensureSymlink(srcPath, destPath)
              .then(() => node(args))
              .then(({ stdout }) => assert.ok(stdout.includes("symlink-file:true")))
              .then(() => trash(destPath))
          })
      , Promise.resolve())
  })

  it("should work with symlinked packages", () => {
    const destPath = "./node_modules/symlink"
    const srcPath = "./node_modules/real"

    return fs
      .ensureSymlink(srcPath, destPath)
      .then(() => runMain("./fixture/main-hook/symlink/package"))
      .then(() => trash(destPath))
  })
})
