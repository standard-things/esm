import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import path from "path"
import require from "./require.js"

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

function node(args) {
  return execa(process.execPath, args, {
    cwd: testPath,
    reject: false
  })
}

function runMain(filePath, env) {
  return execa(process.execPath, ["-r", "../index.js", filePath], {
    cwd: testPath,
    env,
    reject: false
  })
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

    requireFlags.forEach((requireFlag) =>
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push(requireFlag, "../index.js", "./fixture/main/main-module.mjs")
        runs.push(args)
      })
    )

    return Promise.all(runs.map(node))
      .then((results) => {
        results.forEach((result) => {
          if (result.stderr &&
              ! result.stderr.includes("ExperimentalWarning")) {
            throw new Error(result.stderr)
          }

          assert.ok(result.stdout.includes("main-module:false"))
        })
      })
  })

  it("should support `ESM_OPTIONS` environment variable", () =>
    runMain("./node_modules/esm-options", { ESM_OPTIONS: "{cjs:true}" })
    .then((result) => assert.ok(result.stdout.includes("esm-options:true")))
  )

  it("should support `import.meta.url`", () =>
    runMain("./fixture/main/import-meta.mjs")
      .then((result) => {
        const url = testURL + "/fixture/main/import-meta.mjs"
        const expected = JSON.stringify({ url })

        assert.ok(result.stdout.includes("import-meta:" + expected))
      })
  )

  it("should not set `process.mainModule`", () =>
    runMain("./fixture/main/main-module.mjs")
      .then((result) => assert.ok(result.stdout.includes("main-module:false")))
  )

  ;(canTestMissingModuleErrors ? it : xit)(
  "should error for missing modules", function () {
    const fileNames = ["missing", "missing.js", "missing.mjs"]
    const otherFlags = [""]
    const runs = []

    if (canUsePreserveSymlinks) {
      otherFlags.push("--preserve-symlinks")
    }

    fileNames.forEach((fileName) =>
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push("-r", "../index.js", fileName)
        runs.push(args)
      })
    )

    return Promise.all(runs.map(node))
      .then((results) => {
        results.forEach((result) =>
          assert.ok(result.stderr.includes("Error [ERR_MISSING_MODULE]: Cannot find module"))
        )
      })
  })
})
