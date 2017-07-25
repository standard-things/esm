import assert from "assert"

describe("setters", () => {
  it("should be called after eval(...)", () =>
    import("./setter/eval.js")
      .then((ns) => ns.check())
      .catch((e) => assert.ifError(e))
  )

  it("should be called for untouched CJS modules", () =>
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

  it("should throw a type error when setting an imported identifier", () =>
    Promise.all([
      "./setter/import-const.js",
      "./setter/import-let.js",
    ].map((id) =>
      import(id)
        .then(() => assert.ok(false))
        .catch((e) => {
          assert.ok(e instanceof TypeError)
          assert.ok(e.message.startsWith("Assignment to constant variable"))
        })
      ))
  )
})
