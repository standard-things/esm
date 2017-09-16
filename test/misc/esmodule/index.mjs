import assert from "assert"

const customValue = require("./custom.mjs")
const defaultValue = require("./default.mjs")
const noValue = require("../../fixture/export/abc.mjs")

export default () => {
  assert.deepEqual(Object.getOwnPropertyDescriptor(customValue, "__esModule"), {
    configurable: true,
    enumerable: true,
    value: "a",
    writable: true
  })

  assert.deepEqual(Object.getOwnPropertyDescriptor(defaultValue, "__esModule"), {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false
  })

  assert.strictEqual(Object.getOwnPropertyDescriptor(noValue, "__esModule"), void 0)
}
