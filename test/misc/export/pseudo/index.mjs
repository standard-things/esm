import assert from "assert"
import * as customNs from "../../../fixture/export/pseudo/custom.mjs"
import * as defaultNs from "../../../fixture/export/pseudo/default.mjs"
import * as noNs from "../../../fixture/export/abc.mjs"

const customValue = require("../../../fixture/export/pseudo/custom.mjs")
const defaultValue = require("../../../fixture/export/pseudo/default.mjs")
const noValue = require("../../../fixture/export/abc.mjs")

const getDescriptor = Object.getOwnPropertyDescriptor

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
    const descriptor = getDescriptor(object, name)
    return {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable
    }
  }

  assert.strictEqual(getDescriptor(defaultNs, "__esModule"), void 0)
  assert.deepStrictEqual(getDescriptor(defaultValue, "__esModule"), defaultDescriptor)

  assert.deepStrictEqual(getPartialDescriptor(customNs, "__esModule"), partialDescriptor)
  assert.deepStrictEqual(getPartialDescriptor(customValue, "__esModule"), partialDescriptor)

  assert.strictEqual(getDescriptor(noNs, "__esModule"), void 0)
  assert.strictEqual(getDescriptor(noValue, "__esModule"), void 0)
}
