import assert from "assert"

describe("import declarations", () => {
  it("should work in nested scopes", () =>
    import("./import/name")
      .then((ns) => ns.check())
  )

  it("should cope with dependency cycles", () =>
    Promise.all([
      import("./import/cycle-a"),
      import("./import/cycle-a")
    ])
    .then((nss) => nss.forEach((ns) => ns.check()))
  )

  it("should support combinations of import styles", () =>
    import("./import/combinations")
      .then((ns) => ns.check())
  )

  it("should import module.exports as default, by default", () =>
    import("./import/default")
      .then((ns) => ns.check())
  )

  it("should allow same symbol as different locals", () =>
    import("./import/locals")
      .then((ns) => ns.check())
  )

  it("should allow CommonJS modules to set module.exports", () =>
    import("./import/cjs")
      .then((ns) => ns.check())
  )

  it("should support import extensions", () =>
    import("./import/extensions")
      .then((ns) => ns.check())
  )
})
