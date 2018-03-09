import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import mockIo from "mock-stdio"

export default () => {
  return new Promise((resolve) => {
    const allRequire = makeRequire(module, {
      cjs: false,
      mode: "all"
    })

    const cjsRequire = makeRequire(module, {})

    const mjsRequire = makeRequire(module, {
      cjs: false,
      mode: "strict"
    })

    const warningsRequire = makeRequire(module, {
      cache: false,
      cjs: false,
      mode: "strict",
      warnings: false
    })

    allRequire("./fixture/options/all")
    cjsRequire("./fixture/options/cjs")
    mjsRequire("./fixture/options/mjs")

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
