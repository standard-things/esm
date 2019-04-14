import SemVer from "semver"

import assert from "assert"
import execa from "execa"
import path from "path"

const canTestFsPromises = SemVer.satisfies(process.version, ">=10 <11.14")

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
    "-r", "../index.js",
    filename
  ], env)
}

describe("test builtin modules", () => {
  it("should inspect values in `console` logs", () => {
    const filename = path.resolve("fixture/builtin-modules/console-inspect.js")

    return Promise
      .all([
        node([filename]),
        runMain(filename)
      ])
      .then(([builtin, loader]) => {
        assert.strictEqual(loader.stdout, builtin.stdout)
      })
  })

  it("should not provide exports for non-enumerable properties", function () {
    if (! canTestFsPromises) {
      this.skip()
    }

    const filename = path.resolve("fixture/builtin-modules/non-enumerable.mjs")

    return runMain(filename, envAuto)
      .then(({ stderr, stdout }) => {
        assert.ok(stderr.includes("does not provide an export"))
        assert.strictEqual(stdout, "")
      })
  })

  it("should provide exports for non-enumerable properties with `options.cjs.namedExports`", function () {
    if (! canTestFsPromises) {
      this.skip()
    }

    const filename = path.resolve("fixture/builtin-modules/non-enumerable.js")

    return runMain(filename, envAuto)
      .then(({ stderr, stdout }) => {
        assert.strictEqual(stderr.includes("does not provide an export"), false)
        assert.ok(stdout.includes("non-enumerable:true"))
      })
  })
})
