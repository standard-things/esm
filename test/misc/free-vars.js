import assert from "assert"

export function check() {
  assert.throws(() => __dirname, ReferenceError)
  assert.throws(() => __filename, ReferenceError)
  assert.throws(() => exports, ReferenceError)
  assert.throws(() => module, ReferenceError)
  assert.throws(() => require, ReferenceError)
}
