import assert from "assert"
import execa from "execa"
import path from "path"

const testPath = path.resolve(".")

const envAuto = {
  ESM_OPTIONS: "{cjs:true,mode:'auto'}"
}

function node(args, env) {
  return execa(process.execPath, args, {
    cwd: testPath,
    env,
    reject: false
  })
}

function runMain(filename, env) {
  return node([
    "-r", "../",
    filename
  ], env)
}

describe("test builtin modules", () => {
  it("should inspect values with `console.log()`", () => {
    const dirPath = path.resolve("fixture/builtin-modules/console")

    return Promise
      .all([
        node([dirPath]),
        runMain(dirPath)
      ])
      .then(([builtin, loader]) => {
        assert.strictEqual(loader.stdout, builtin.stdout)
      })
  })
})
