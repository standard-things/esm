import assert from "assert"
import vm from "vm"

let canUseAsyncAwait = false

try {
  canUseAsyncAwait = !! new vm.Script("async()=>await 1")
} catch (e) {}

describe("top-level await", () => {
  (canUseAsyncAwait ? it : xit)(
  "should support `options.await`", () =>
    Promise
      .all([
        "./fixture/top-level-await/empty-cjs.js",
        "./fixture/top-level-await/empty-esm.js",
        "./fixture/top-level-await/export-cjs.js",
        "./fixture/top-level-await/nested.js"
      ]
      .map((id) => import(id)))
  )

  ;(canUseAsyncAwait ? it : xit)(
  "should not support `options.await` for ES modules with exports", () =>
    Promise
      .all([
        "./fixture/top-level-await/export-esm.js",
        "./fixture/top-level-await/re-export.js"
      ]
      .map((id) =>
        import(id)
          .then(() => assert.ok(false))
          .catch((e) => assert.strictEqual(e.name, "SyntaxError"))
      ))
  )
})
