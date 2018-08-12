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

function runMainBuiltin(filename) {
  return node([filename])
}

function runMainLoader(filename) {
  return node([
    "-r", "../",
    filename
  ])
}

describe("test builtin modules", function () {
  it("should inspect values with `console.log`", function () {
    const dirPath = path.resolve(testPath, "fixture/builtin-modules/console")

    return Promise.all([
      runMainBuiltin(dirPath),
      runMainLoader(dirPath)
    ])
    .then(([builtin, loader]) =>
      assert.strictEqual(builtin.stdout, loader.stdout)
    )
  })
})
