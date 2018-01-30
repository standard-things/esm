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

describe("command-line hook", function () {
  this.timeout(0)

  it("should not fail on unresolvable command-line arguments", () =>
    node([
      "./node_modules/cli-hook",
      "UNRESOLVABLE_VALUE",
      "../index.js"
    ])
    .then((result) => assert.strictEqual(result.stderr, ""))
  )

  it("should inspect JSON encoded command-line arguments", () =>
    node([
      "./node_modules/cli-hook",
      '{"r":"../index.js"}'
    ])
    .then((result) => assert.ok(result.stdout.includes("cli-hook:true")))
  )
})
