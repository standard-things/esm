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
  it("should inspect values in `console` logs", () => {
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

  it("should not provided exports for non-enumerable properties", () => {
    const filename = path.resolve("fixture/builtin-modules/fs.mjs")

    return runMain(filename, envAuto)
      .then(({ stderr, stdout }) => {
        assert.ok(stderr.includes("does not provide an export"))
        assert.strictEqual(stdout, "")
      })
  })

  it("should provided exports for non-enumerable properties with `options.cjs.namedExports`", () => {
    const filename = path.resolve("fixture/builtin-modules/fs.js")

    return runMain(filename, envAuto)
      .then(({ stderr, stdout }) => {
        assert.strictEqual(stderr.includes("does not provide an export"), false)
        assert.ok(stdout.includes("enumerable:true"))
      })
  })
})
