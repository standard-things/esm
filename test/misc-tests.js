import assert from "assert"

describe("spec compliance", () => {
  it("should bind exports before the module executes", () =>
    import("./misc/exports")
      .then((ns) => ns.check())
  )

  it("should establish live binding of values", () =>
    import("./misc/live-binding")
      .then((ns) => ns.check())
  )

  it("should execute modules in the correct order", () =>
    import("./misc/order-checker")
      .then((ns) => ns.check())
  )

  it("should have a top-level `this` of `undefined`", () =>
    import("./misc/this")
      .then((ns) => ns.check())
  )
})

describe("built-in modules", () => {
  it("should fire setters if already loaded", () =>
    import("./misc/loaded-module")
      .then((ns) => ns.check())
  )
})
