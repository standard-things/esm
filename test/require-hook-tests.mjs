import assert from "assert"

describe("require hook", () => {
  it("should create an ESM loader", () =>
    import("./require/loader.mjs")
      .then((ns) => ns.default())
  )

  it("should support `options.sourceMap`", () =>
    import("./require/source-map.mjs")
      .then((ns) => ns.default())
  )

  it("should support live binding", () =>
    import("./require/live.mjs")
      .then((ns) => ns.default())
  )

  it("should support named exports", () =>
    import("./require/named.mjs")
      .then((ns) => ns.default())
  )

  it("should support namespace exports", () =>
    import("./require/namespace.mjs")
      .then((ns) => ns.default())
  )

  it("should support creating multiple loaders with different options", () =>
    import("./require/mixed.mjs")
      .then((ns) => ns.default())
  )
})
