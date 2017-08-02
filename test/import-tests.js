import assert from "assert"

describe("import declarations", () => {
  it("should cope with dependency cycles", () =>
    Promise.all([
      import("./import/cycle-a.js"),
      import("./import/cycle-a.js")
    ])
    .then((namespaces) => namespaces.forEach((ns) => ns.check()))
    .catch((e) => assert.ifError(e))
  )

  it("should support combinations of import styles", () =>
    import("./import/combinations.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should support same symbol as different locals", () =>
    import("./import/locals.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should support CJS modules setting module.exports", () =>
    import("./import/cjs.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should parse URL ids", () =>
    import("./import/parsable.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not parse URL ids with encoded slashes", () =>
    import("./import/unparsable.js")
      .then(() => assert.ok(false))
      .catch((e) => assert.strictEqual(e.code, "MODULE_NOT_FOUND"))
  )

  it("should support import extensions", () =>
    import("./import/extension.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})
