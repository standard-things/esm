import assert from "assert"

export default () => {
  const id = require.resolve("../../fixture/cache/in")

  assert.strictEqual(require(id).default, 1)
  assert.ok(id in require.cache)
  assert.strictEqual(require(id).default, 1)

  delete require.cache[id]
  assert.strictEqual(require(id).default, 2)
}
