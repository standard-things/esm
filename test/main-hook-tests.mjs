import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import path from "path"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

const NODE_BIN = path.resolve(__dirname, "env/prefix", isWin ? "node.exe" : "bin/node")

const canUsePreserveSymlinks = SemVer.satisfies(process.version, ">=6.3.0")
const dirnameURL = "file://" + (isWin ? "/" : "") + __dirname.replace(/\\/g, "/")
const requireFlags = ["-r", "--require"]

function runMain(args) {
  return execa(NODE_BIN, args, {
    cwd: __dirname,
    reject: false
  })
}

describe("module.runMain hook", () => {
  it("should work with Node -r and --require requireFlags", () => {
    const runs = requireFlags.map((requireFlag) => [
      requireFlag, "../index.js",
      "./fixture/main.mjs"
    ])

    return Promise.all(runs.map(runMain))
      .then((results) => {
        const url = dirnameURL + "/fixture/main.mjs"

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

          if (result.stderr) {
            throw new Error(result.stderr)
          }

          assert.deepStrictEqual(exported, expected)
        })
      })
  })

  it("should throw correct error for missing modules", () => {
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

    return Promise.all(runs.map(runMain))
      .then((results) => {
        results.forEach((result) =>
          assert.ok(result.stderr.includes("Error [ERR_MISSING_MODULE]: Cannot find module"))
        )
      })
  })
})
