import assert from "assert"
import { resolve } from "path"
import execa from "execa"
import { execPath } from "process"

const testPath = resolve(".")

function node(args, env) {
  return execa(execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

function runMain(filename, env, arg) {
  return node(["-r", "../", filename, arg], env)
}

function runMainPlain(filename) {
  return node([filename])
}

describe("test builtin modules", function () {
  it("console should work the same as in node", function () {
    const test = resolve(testPath, "fixture/builtin-modules/console")

    return Promise.all([
      runMainPlain(test),
      runMain(test)
    ])
    .then(([result1, result2]) => {
      assert.strictEqual(result1.stdout, result2.stdout)
    })
  })
})
