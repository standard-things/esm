import assert from "assert"

describe("spec compliance", () => {
  it("should bind exports before the module executes", () =>
    import("./misc/exports.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should establish live binding of values", () =>
    import("./misc/live.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should produce valid namespace objects", () =>
    import("./misc/namespace.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should not populate top-level `arguments`", () =>
    import("./misc/arguments.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )

  it("should not have CJS free variables", () =>
    import("./misc/free-vars.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )
})

describe("built-in modules", () => {
  it("should fire setters if already loaded", () =>
    import("./misc/loaded.js")
      .then((ns) => ns.check())
      .catch(() => assert.ok(false))
  )
})
