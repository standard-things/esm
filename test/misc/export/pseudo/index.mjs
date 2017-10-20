import assert from "assert"
import * as customNs from "../../../fixture/export/pseudo/custom.mjs"
import * as defaultNs from "../../../fixture/export/pseudo/default.mjs"
import * as noNs from "../../../fixture/export/abc.mjs"

const customValue = require("../../../fixture/export/pseudo/custom.mjs")
const defaultValue = require("../../../fixture/export/pseudo/default.mjs")
const noValue = require("../../../fixture/export/abc.mjs")

export default () => {
  const customDescriptor = {
    configurable: false,
    enumerable: true,
    value: "a",
    writable: true
  }

  const defaultDescriptor = {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false
  }

  assert.strictEqual(Object.getOwnPropertyDescriptor(defaultNs, "__esModule"), void 0)
  assert.deepStrictEqual(Object.getOwnPropertyDescriptor(customValue, "__esModule"), customDescriptor)

  assert.deepStrictEqual(Object.getOwnPropertyDescriptor(customNs, "__esModule"), customDescriptor)
  assert.deepStrictEqual(Object.getOwnPropertyDescriptor(defaultValue, "__esModule"), defaultDescriptor)

  assert.strictEqual(Object.getOwnPropertyDescriptor(noNs, "__esModule"), void 0)
  assert.strictEqual(Object.getOwnPropertyDescriptor(noValue, "__esModule"), void 0)
}
