import assert from "assert"
import * as customNs from "../../fixture/cjs/export/pseudo-custom.js"
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
  assert.deepStrictEqual(getDescriptor(customNs, "__esModule"), { configurable: false, enumerable: true })
  assert.deepStrictEqual(getDescriptor(customValue, "__esModule"), { configurable: true, enumerable: true })
}
