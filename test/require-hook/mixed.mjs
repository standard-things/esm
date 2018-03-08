import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import mockIo from "mock-stdio"

export default () => {
  return new Promise((resolve) => {
    const allRequire = makeRequire(module, { mode: "all" })
    const autoRequire = makeRequire(module, { mode: "auto" })
    const cjsRequire = makeRequire(module, { cjs: true })
    const mjsRequire = makeRequire(module, { mode: "mjs" })
    const shorthandRequire = makeRequire(module, { mode: "cjs" })
    const warningsRequire = makeRequire(module, { cache: false, warnings: false })

    allRequire("./fixture/options/all")
    autoRequire("./fixture/options/auto")
    cjsRequire("./fixture/options/cjs")
    mjsRequire("./fixture/options/mjs")
    shorthandRequire("./fixture/options/shorthand")

    mockIo.start()
    warningsRequire("./fixture/options/warnings")

    setImmediate(() => {
      mockIo.end()
      assert.deepStrictEqual(mockIo.end(), { stderr: "", stdout: "" })

      assert.ok(Reflect.has(global, "this"))
      assert.strictEqual(global.this, "undefined")
      resolve()
    })
  })
}
