import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import fs from "fs-extra"
import path from "path"

const testPath = path.resolve(".")

const canTestWithFilename = SemVer.satisfies(process.version, ">=10")
const canTestWithStdin = SemVer.satisfies(process.version, ">=8")

function node(args) {
  return execa(process.execPath, args, {
    cwd: testPath,
    reject: false
  })
}

function shell(command) {
  return execa.shell(command, {
    cwd: testPath,
    reject: false
  })
}

describe("--check hook", function () {
  this.timeout(0)

  ;(canTestWithFilename ? it : xit)(
  "should support `-c` and `--check` flags with a filename", () => {
    const checkFlags = ["-c", "--check"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    requireFlags.forEach((requireFlag) => {
      checkFlags.forEach((checkFlag) => {
        runs.push([
          requireFlag, "../",
          checkFlag, "./fixture/check-hook"
        ])
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => {
            assert.strictEqual(result.stderr, "")
            assert.strictEqual(result.stdout, "")
          })
      , Promise.resolve())
  })

  ;(canTestWithStdin ? it : xit)(
  "should support `-c` and `--check` flags with stdin", () => {
    const checkFlags = ["-c", "--check"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    const code = fs
      .readFileSync("fixture/check-hook/index.js", "utf8")
      .replace(/(?:\r?\n)+/g, ";")

    requireFlags.forEach((requireFlag) => {
      checkFlags.forEach((checkFlag) => {
        runs.push([
          "echo '" + code + "' |",
          process.execPath,
          requireFlag, "../",
          checkFlag
        ].join(" "))
      })
    })

    return runs
      .reduce((promise, command) =>
        promise
          .then(() => shell(command))
          .then((result) => {
            assert.strictEqual(result.stderr, "")
            assert.strictEqual(result.stdout, "")
          })
      , Promise.resolve())
  })
})
