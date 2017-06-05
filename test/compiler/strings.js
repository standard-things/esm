import assert from "assert"

export function check() {
  assert.strictEqual(
    'a; import b from "c"; d',
    "a; import b " + 'from "c"; d'
  )
}
