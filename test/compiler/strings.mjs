import assert from "assert"

export default () => {
  assert.strictEqual(
    'a; import b from "c"; d',
    "a; import b " + 'from "c"; d'
  )
}
