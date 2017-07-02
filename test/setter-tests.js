import assert from "assert"
import path from "path"

describe("runSetters", () => {
  it("should be called after eval(...)", () =>
    import("./setter/eval.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should be called for untouched CJS modules, too", () =>
    import("./setter/cjs.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})

describe("bridge modules", () => {
  it("should not prematurely seal * exports", () =>
    import("./setter/seal.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})

describe("parent setters", () => {
  it("should be run when children update exports", () =>
    import("./setter/children.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should discard setters for constant values", () =>
    import("./setter/const.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )
})
