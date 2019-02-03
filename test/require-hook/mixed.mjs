import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"

export default () => {
  const allRequire = makeRequire(module, {
    cjs: false,
    mode: "all"
  })

  const cjsRequire = makeRequire(module, {
    cjs: true,
    mode: "auto"
  })

  const mjsRequire = makeRequire(module, {
    cjs: false,
    mode: "strict"
  })

  assert.doesNotThrow(() => allRequire("./fixture/require-hook/options/all"))
  assert.ok(Reflect.has(global, "this"))
  assert.strictEqual(global.this, "undefined")

  assert.doesNotThrow(() => cjsRequire("./fixture/require-hook/options/cjs"))
  assert.doesNotThrow(() => mjsRequire("./fixture/require-hook/options/mjs"))
}
