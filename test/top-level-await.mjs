import assert from "assert"
import vm from "vm"

let canUseAsyncAwait = false

try {
  canUseAsyncAwait = !! new vm.Script("async()=>await 1")
} catch (e) {}

describe("top-level await", () => {
  (canUseAsyncAwait ? it : xit)(
  "should support `options.await`", () =>
    Promise.all([
      "./fixture/top-level-await/empty.js",
      "./fixture/top-level-await/empty.mjs",
      "./fixture/top-level-await/export.js",
      "./fixture/top-level-await/nested.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(true))
    ))
  )

  ;(canUseAsyncAwait ? it : xit)(
  "should not support `options.await` for ES modules with exports", () =>
    Promise.all([
      "./fixture/top-level-await/export.mjs",
      "./fixture/top-level-await/re-export.mjs"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => assert.strictEqual(e.name, "SyntaxError"))
    ))
  )
})
