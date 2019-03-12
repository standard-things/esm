import assert from "assert"
import makeRequire from "../../index.js"
import module from "../module.js"

export default () => {
  const allRequire = makeRequire(module, {
    cjs: false,
    force: true,
    mode: "all"
  })

  const cjsRequire = makeRequire(module, {
    cjs: true,
    force: true,
    mode: "auto"
  })

  assert.doesNotThrow(() => allRequire("./fixture/options-force/all/index.js"))
  assert.ok(Reflect.has(global, "this"))
  assert.strictEqual(global.this, "undefined")

  assert.doesNotThrow(() => cjsRequire("./fixture/options-force/cjs"))
}
