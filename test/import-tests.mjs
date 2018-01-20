import assert from "assert"

describe("import declarations", () => {
  it("should support same symbol as different locals", () =>
    import("./import/locals.mjs")
      .then((ns) => ns.default())
  )

  it("should support mixed import styles", () =>
    import("./cjs/import/mixed.mjs")
      .then((ns) => ns.default())
  )

  it("should support CJS modules setting `module.exports`", () =>
    import("./cjs/import/exports.mjs")
      .then((ns) => ns.default())
  )

  it("should parse URL ids", () =>
    import("./import/url-ids.mjs")
      .then((ns) => ns.default())
  )

  it("should not parse URL ids with encoded slashes", () =>
    import("./import/url-slashes.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_MISSING_MODULE"))
  )
})
