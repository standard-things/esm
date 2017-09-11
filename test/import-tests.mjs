import assert from "assert"

describe("import declarations", () => {
  it("should cope with dependency cycles", () =>
    Promise.all([
      import("./import/cycle/a.mjs"),
      import("./import/cycle/a.mjs")
    ])
    .then((namespaces) => namespaces.forEach((ns) => ns.default()))
    .catch((e) => assert.ifError(e))
  )

  it("should support combinations of import styles", () =>
    import("./import/cjs/combinations.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support same symbol as different locals", () =>
    import("./import/locals.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support CJS modules setting `module.exports`", () =>
    import("./import/cjs/cjs.mjs")
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
