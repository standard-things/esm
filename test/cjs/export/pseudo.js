import assert from "assert"
import * as customNs from "../../fixture/cjs/export/pseudo-custom.js"
import * as defaultNs from "../../fixture/cjs/export/nothing.mjs"
import * as noNs from "../../fixture/export/abc.mjs"

const customValue = require("../../fixture/cjs/export/pseudo-custom.js")
const defaultValue = require("../../fixture/cjs/export/nothing.mjs")
const noValue = require("../../fixture/export/abc.mjs")

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
  assert.strictEqual(Reflect.getOwnPropertyDescriptor(defaultValue, "__esModule"), void 0)

  assert.deepStrictEqual(getPartialDescriptor(customNs, "__esModule"), partialDescriptor)
  assert.deepStrictEqual(getPartialDescriptor(customValue, "__esModule"), partialDescriptor)

  assert.strictEqual(Reflect.getOwnPropertyDescriptor(noNs, "__esModule"), void 0)
  assert.strictEqual(Reflect.getOwnPropertyDescriptor(noValue, "__esModule"), void 0)
}
