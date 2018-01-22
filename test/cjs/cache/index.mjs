import assert from "assert"
import path from "path"

export default () => {
  const filePath = path.resolve("fixture/cache/in/index.mjs")

  assert.strictEqual(require(filePath).default, 1)
  assert.ok(filePath in require.cache)
  assert.strictEqual(require(filePath).default, 1)

  delete require.cache[filePath]
  assert.strictEqual(require(filePath).default, 2)
}
