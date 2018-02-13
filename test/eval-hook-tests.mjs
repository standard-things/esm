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

describe("--eval hook", function () {
  this.timeout(0)

  it("should support `-e` and `--eval` flags", () => {
    const evalFlags = ["-e", "--eval"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    requireFlags.forEach((requireFlag) => {
      evalFlags.forEach((evalFlag) => {
        runs.push([
          requireFlag, "../",
          evalFlag, [
            'import console from "console"',
            'console.log("eval-hook:true")'
          ].join("\n")
        ])
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => assert.ok(result.stdout.includes("eval-hook:true")))
      , Promise.resolve())
  })

  it("should support `-p`, `-pe`, and `--print` flags", () => {
    const printFlags = ["-p", "-pe", "--print"]
    const requireFlags = ["-r", "--require"]
    const runs = []

    requireFlags.forEach((requireFlag) => {
      printFlags.forEach((printFlag) => {
        runs.push([
          requireFlag, "../",
          printFlag, [
            'import { format } from "util"',
            'format("print-hook:%s", true)'
          ].join("\n")
        ])
      })
    })

    return runs
      .reduce((promise, args) =>
        promise
          .then(() => node(args))
          .then((result) => assert.ok(result.stdout.includes("print-hook:true")))
      , Promise.resolve())
  })
})
