import assert from "assert"

export default function () {
  assert.strictEqual(
    'a; import b from "c"; d',
    "a; import b " + 'from "c"; d'
  )
}
