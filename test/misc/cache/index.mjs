import assert from "assert"

export default () => {
  const id = require.resolve("../../fixture/cache/in")

  require(id)
  assert.ok(id in require.cache)

  delete require.cache[id]
  assert.strictEqual(require(id).default, 2)
}
