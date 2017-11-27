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
const requireFlags = ["-r", "--require"]

const testPath = path.dirname(require.resolve("./tests.mjs"))
const testURL = fileProtocol + testPath.replace(/\\/g, "/")

function node(args) {
  return execa(process.execPath, args, {
    cwd: testPath,
    reject: false
  })
}

describe("module.runMain hook", function () {
  this.timeout(0)

  it("should work with Node -r and --require", () => {
    const otherFlags = canUseExperimentalModules ? ["", "--experimental-modules"] : [""]
    const runs = []

    requireFlags.forEach((requireFlag) =>
      otherFlags.forEach((flag) => {
        const args = flag ? [flag] : []
        args.push(requireFlag, "../index.js", "./fixture/main.mjs")
        runs.push(args)
      })
    )

    return Promise.all(runs.map(node))
      .then((results) => {
        const url = testURL + "/fixture/main.mjs"

        const expected = {
          mainModule: false,
          meta: { url }
        }

        results.forEach((result) => {
          const jsonText = result
            .stdout
            .split("\n")
            .reverse()
            .find((line) => line.startsWith("{"))

          const exported = jsonText
            ? JSON.parse(jsonText)
            : {}

          if (result.stderr &&
              ! result.stderr.includes("ExperimentalWarning")) {
            throw new Error(result.stderr)
          }

          assert.deepStrictEqual(exported, expected)
        })
      })
  })

  ;(canTestMissingModuleErrors ? it : xit)(
  "should error for missing modules", function () {
    const fileNames = ["missing", "missing.js", "missing.mjs"]
    const otherFlags = canUsePreserveSymlinks ? ["", "--preserve-symlinks"] : [""]
    const runs = []

    fileNames.forEach((fileName) =>
      requireFlags.forEach((requireFlag) =>
        otherFlags.forEach((flag) => {
          const args = flag ? [flag] : []
          args.push(requireFlag, "../index.js", fileName)
          runs.push(args)
        })
      )
    )

    return Promise.all(runs.map(node))
      .then((results) => {
        results.forEach((result) =>
          assert.ok(result.stderr.includes("Error [ERR_MISSING_MODULE]: Cannot find module"))
        )
      })
  })
})
