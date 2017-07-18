import assert from "assert"

describe("spec compliance", () => {
  it("should bind exports before the module executes", () =>
    import("./misc/export.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should establish live binding of values", () =>
    import("./misc/live.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/namespace.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not populate top-level `arguments`", () =>
    import("./misc/arguments.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should not export duplicate bindings", () =>
    import("./misc/export-dups.js")
      .then(() => assert.ok(false))
      .catch((e) => {
        assert.ok(e instanceof SyntaxError)
        assert.ok(e.message.endsWith("has already been declared"))
      })
  )

  it("should error on importing non-exported binding", () =>
    Promise.all([
      "./misc/import-missing-cjs.js",
      "./misc/import-missing-esm.js"
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof SyntaxError)
          assert.ok(e.message.endsWith("not found"))
        })
    ))
  )
})

describe("built-in modules", () => {
  it("should fire setters if already loaded", () =>
    import("./misc/loaded.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})
