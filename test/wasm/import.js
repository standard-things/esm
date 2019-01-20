import assert from "assert"
import createNamespace from "../create-namespace.js"
import addTen, { add } from "../fixture/wasm/add.wasm"
import * as ns from "../fixture/wasm/add.wasm"

export default () => {
  assert.strictEqual(add(1, 2), 3)
  assert.strictEqual(addTen(3), 13)
  assert.deepStrictEqual(ns, createNamespace({ add, default: addTen }))
}
