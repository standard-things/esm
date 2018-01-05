import assert from "assert"

export default () => {
  const filePath = require.resolve("../../fixture/cache/in")

  assert.strictEqual(require(filePath).default, 1)
  assert.ok(filePath in require.cache)
  assert.strictEqual(require(filePath).default, 1)

  delete require.cache[filePath]
  assert.strictEqual(require(filePath).default, 2)
}
