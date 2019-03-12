import assert from "assert"
import execa from "execa"
import path from "path"

const testPath = path.resolve(".")

function node(args) {
  return execa(process.execPath, args, {
    cwd: testPath,
    reject: false
  })
}

describe("--eval hook tests", function () {
  this.timeout(0)

  it("should support `-e` and `--eval` flags", () => {
    const evalFlags = ["-e", "--eval"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    for (const requireFlag of requireFlags) {
      for (const evalFlag of evalFlags) {
        runs.push([
          requireFlag, "../index.js",
          evalFlag, [
            'import { log } from "console"',
            'log("eval-hook:true")'
          ].join("\n")
        ])
      }
    }

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then(({ stdout }) => assert.ok(stdout.includes("eval-hook:true")))
      , Promise.resolve())
  })

  it("should support `-p`, `-pe`, and `--print` flags", () => {
    const printFlags = ["-p", "-pe", "--print"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    for (const requireFlag of requireFlags) {
      for (const printFlag of printFlags) {
        runs.push([
          requireFlag, "../index.js",
          printFlag, [
            'import { format } from "util"',
            'format("print-hook:%s", true)'
          ].join("\n")
        ])
      }
    }

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then(({ stdout }) => assert.ok(stdout.includes("print-hook:true")))
      , Promise.resolve())
  })
})
