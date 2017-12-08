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

  it("should support loading extensionless files with `require`", () =>
    import("./file-extension/no-ext-require.js")
      .then((ns) => ns.default())
  )

  it("should support loading unknown extensions with `require`", () =>
    import("./file-extension/unknown.require.js")
      .then((ns) => ns.default())
  )

  it("should not support loading extensionless files with dynamic import in CJS", () =>
    import("./file-extension/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should not support loading extensionless files with dynamic import in ESM", () =>
    import("./file-extension/no-ext.mjs")
      .then((ns) => ns.default())
  )

  it("should not support loading unknown extensions with dynamic import in CJS", () =>
    import("./file-extension/unknown.js")
      .then((ns) => ns.default())
  )

  it("should not support loading unknown extensions with dynamic import in ESM", () =>
    import("./file-extension/unknown.mjs")
      .then((ns) => ns.default())
  )

  it("should not support loading `.mjz.gz` with `require`", () =>
    import("./file-extension/mjs.gz.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_REQUIRE_ESM"))
  )
})
