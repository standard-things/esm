import assert from "assert"
import path from "path"

export default () => {
  const filename = path.resolve("fixture/cache/in/index.mjs")

  assert.strictEqual(require(filename).default, 1)
  assert.ok(filename in require.cache)
  assert.strictEqual(require(filename).default, 1)

  Reflect.deleteProperty(require.cache, filename)
  assert.strictEqual(require(filename).default, 2)
}
