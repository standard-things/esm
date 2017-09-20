import assert from "assert"

describe("import declarations", () => {
  it("should support same symbol as different locals", () =>
    import("./import/locals.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support mixed import styles", () =>
    import("./import/cjs/mixed.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support CJS modules setting `module.exports`", () =>
    import("./import/cjs/exports.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should parse URL ids", () =>
    import("./import/url-ids.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should not parse URL ids with encoded slashes", () =>
    import("./import/url-slashes.mjs")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "ERR_MISSING_MODULE"))
  )
})
