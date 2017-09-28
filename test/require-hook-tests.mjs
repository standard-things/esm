import assert from "assert"

describe("require hook", () => {
  it("should create an ESM loader", () =>
    import("./require/loader.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support `options.sourceMap`", () =>
    import("./require/source-map.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support live binding", () =>
    import("./require/live.mjs")
      .then((ns) => ns.default())
      .catch((e) => assert.ifError(e))
  )

  it("should support creating multiple loaders with different options", (done) => {
    import("./require/mixed.mjs")
      .then((ns) => ns.default(done))
      .catch((e) => assert.ifError(e))
  })
})
