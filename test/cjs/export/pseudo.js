import assert from "assert"
import * as customNs1 from "../../fixture/export/pseudo-custom.mjs"
import * as customNs2 from "../../fixture/cjs/export/pseudo-custom.js"
import * as defaultNs from "../../fixture/export/nothing.mjs"

const customValue = require("../../fixture/cjs/export/pseudo-custom.js")

export default () => {
  function getDescriptor(object, name) {
    const {
      configurable,
      enumerable
    } = Reflect.getOwnPropertyDescriptor(object, name)

    return { configurable, enumerable }
  }

  assert.strictEqual(Reflect.getOwnPropertyDescriptor(defaultNs, "__esModule"), void 0)
  assert.deepStrictEqual(getDescriptor(customNs1, "__esModule"), { configurable: false, enumerable: true })
  assert.deepStrictEqual(getDescriptor(customNs2, "__esModule"), { configurable: true, enumerable: true })
  assert.deepStrictEqual(getDescriptor(customValue, "__esModule"), { configurable: true, enumerable: true })
}
