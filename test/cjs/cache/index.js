import assert from "assert"
import path from "path"

export default () => {
  const filename = path.resolve("fixture/cache/in/index.mjs")

  return import(filename)
    .then((ns) => {
      assert.strictEqual(ns.default, 1)
      assert.ok(Reflect.has(require.cache, filename))

      return import(filename)
        .then((ns) => {
          assert.strictEqual(ns.default, 1)

          Reflect.deleteProperty(require.cache, filename)

          return import(filename)
            .then((ns) => assert.strictEqual(ns.default, 2))
        })
    })
}
