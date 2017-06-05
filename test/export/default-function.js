import assert from "assert"

const object = {}

export default function f() {
  return object
}

export function check(g) {
  assert.strictEqual(f, g)
  assert.strictEqual(f(), object)
}
