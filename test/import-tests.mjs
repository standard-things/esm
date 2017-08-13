import assert from "assert"

describe("import declarations", () => {
  it("should cope with dependency cycles", () =>
    Promise.all([
      import("./import/cycle-a.mjs"),
      import("./import/cycle-a.mjs")
    ])
    .then((namespaces) => namespaces.forEach((ns) => ns.check()))
    .catch((e) => assert.ifError(e))
  )

  it("should support combinations of import styles", () =>
    import("./import/cjs/combinations.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should support same symbol as different locals", () =>
    import("./import/locals.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should support CJS modules setting `module.exports`", () =>
    import("./import/cjs/cjs.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should parse URL ids", () =>
    import("./import/parsable.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not parse URL ids with encoded slashes", () =>
    import("./import/unparsable.mjs")
      .then(() => assert.ok(false))
      .catch(({ code }) => assert.strictEqual(code, "MODULE_NOT_FOUND"))
  )

  xit("should support import extensions", () =>
    import("./import/extension.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})
