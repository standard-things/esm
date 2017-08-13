import assert from "assert"
import {
  constructor,
  hasOwnProperty,
  toString,
  valueOf
} from "../fixture/export/shadowed.mjs"

export function check() {
  assert.strictEqual(constructor, "a")
  assert.strictEqual(hasOwnProperty, "b")
  assert.strictEqual(toString, "c")
  assert.strictEqual(valueOf, "d")
}
