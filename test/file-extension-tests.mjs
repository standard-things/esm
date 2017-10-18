import assert from "assert"

describe("file extension", () => {
  it("should support loading `.gz` files in CJS", () =>
    import("./file-extension/gz.js")
      .then((ns) => ns.default())
  )

  it("should support loading `.gz` files in ESM", () =>
    import("./file-extension/gz.mjs")
      .then((ns) => ns.default())
  )

  it("should not support loading `.mjz.gz` with `require`", () =>
    import("./file-extension/mjs.gz.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_REQUIRE_ESM"))
  )
})
