import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import mockIo from "mock-stdio"

export default () => {
  return new Promise((resolve) => {
    const allRequire = makeRequire(module, { esm: "all" })
    const cjsRequire = makeRequire(module, { cjs: true })
    const jsRequire = makeRequire(module, { esm: "js" })
    const mjsRequire = makeRequire(module, { esm: "mjs" })
    const shorthandRequire = makeRequire(module, { esm: "cjs" })
    const warningsRequire = makeRequire(module, { cache: false, warnings: false })

    allRequire("./fixture/options/all")
    cjsRequire("./fixture/options/cjs")
    jsRequire("./fixture/options/js")
    mjsRequire("./fixture/options/mjs")
    shorthandRequire("./fixture/options/shorthand")

    mockIo.start()
    warningsRequire("./fixture/options/warnings")

    setImmediate(() => {
      mockIo.end()
      assert.deepStrictEqual(mockIo.end(), { stderr: "", stdout: "" })

      assert.ok("this" in global)
      assert.strictEqual(global.this, "undefined")
      resolve()
    })
  })
}
