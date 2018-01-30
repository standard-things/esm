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

  it("should support Node -e and --eval", () => {
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
})
