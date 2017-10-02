import assert from "assert"

const customValue = require("../../../fixture/export/pseudo/custom.mjs")
const defaultValue = require("../../../fixture/export/pseudo/default.mjs")
const noValue = require("../../../fixture/export/abc.mjs")

export default () => {
  assert.deepStrictEqual(Object.getOwnPropertyDescriptor(customValue, "__esModule"), {
    configurable: false,
    enumerable: true,
    value: "a",
    writable: true
  })

  assert.deepStrictEqual(Object.getOwnPropertyDescriptor(defaultValue, "__esModule"), {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false
  })

  assert.strictEqual(Object.getOwnPropertyDescriptor(noValue, "__esModule"), void 0)
}
