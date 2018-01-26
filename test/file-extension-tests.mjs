import assert from "assert"

describe("file extension", () => {
  it("should support loading `.gz` files in CJS", () =>
    import("./gz/gz.js")
      .then((ns) => ns.default())
  )

  it("should support loading `.gz` files in ESM", () =>
    import("./gz/gz.mjs")
      .then((ns) => ns.default())
  )

  it("should not support loading `.mjs.gz` with `require`", () =>
    import("./gz/mjs.gz.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_REQUIRE_ESM"))
  )

  it("should support loading extensionless files with `require`", () =>
    import("./ext/no-ext-require.js")
      .then((ns) => ns.default())
  )

  it("should support loading unknown extensions with `require`", () =>
    import("./ext/unknown.require.js")
      .then((ns) => ns.default())
  )

  it("should not support loading extensionless files with dynamic import in CJS", () =>
    import("./ext/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should support loading extensionless files with dynamic import in CJS with `options.cjs.paths`", () =>
    import("./cjs/ext/no-ext.js")
      .then((ns) => ns.default())
  )

  it("should not support loading extensionless files with dynamic import in ESM", () =>
    import("./ext/no-ext.mjs")
      .then((ns) => ns.default())
  )

  it("should support loading extensionless files with dynamic import in ESM with `options.cjs.paths`", () =>
    import("./cjs/ext/no-ext.mjs")
      .then((ns) => ns.default())
  )

  it("should not support loading unknown extensions with dynamic import in CJS", () =>
    import("./ext/unknown.js")
      .then((ns) => ns.default())
  )

  it("should support loading unknown extensions with dynamic import in CJS with `options.cjs.paths`", () =>
    import("./cjs/ext/unknown.js")
      .then((ns) => ns.default())
  )

  it("should not support loading unknown extensions with dynamic import in ESM", () =>
    import("./ext/unknown.mjs")
      .then((ns) => ns.default())
  )

  it("should support loading unknown extensions with dynamic import in ESM with `options.cjs.paths`", () =>
    import("./cjs/ext/unknown.mjs")
      .then((ns) => ns.default())
  )
})
