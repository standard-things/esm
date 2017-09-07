import assert from "assert"

describe("setters", () => {
  it("should be called after eval(...)", () =>
    import("./setter/eval.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should be called for untouched CJS modules", () =>
    import("./setter/untouched.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})

describe("bridge modules", () => {
  it("should not prematurely seal * exports", () =>
    import("./setter/seal.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})

describe("parent setters", () => {
  it("should be run when children update exports", () =>
    import("./setter/children.mjs")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})
