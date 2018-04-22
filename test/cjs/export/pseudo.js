import assert from "assert"
import * as customNs from "../../fixture/cjs/export/pseudo-custom.js"
import * as defaultNs from "../../fixture/export/nothing.mjs"

const customValue = require("../../fixture/cjs/export/pseudo-custom.js")

export default () => {
  const partialDescriptor = {
    configurable: false,
    enumerable: true
  }

  const defaultDescriptor = {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false
  }

  function getPartialDescriptor(object, name) {
    const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

    return {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable
    }
  }

  assert.strictEqual(Reflect.getOwnPropertyDescriptor(defaultNs, "__esModule"), void 0)
  assert.deepStrictEqual(getPartialDescriptor(customNs, "__esModule"), partialDescriptor)
  assert.deepStrictEqual(getPartialDescriptor(customValue, "__esModule"), partialDescriptor)
}
